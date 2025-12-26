#include "sync_service.h"
#include "services/http/http.h"
#include "esp_log.h"
#include <dirent.h>
#include <cstring>
#include <sys/stat.h>

static const char *TAG = "sync-service";

namespace sync {

SyncService::SyncService(const SyncConfig &config, Wifi &wifi)
    : config_(config), wifi_(wifi), fileTracker_(config.processedLogFile) {
  ESP_LOGI(TAG, "SyncService initialized");
  ESP_LOGI(TAG, "  Server: %s%s", config_.serverBaseUrl, config_.uploadEndpoint);
  ESP_LOGI(TAG, "  Recordings dir: %s", config_.recordingsDir);
  ESP_LOGI(TAG, "  Sync interval: %lu seconds", config_.syncIntervalSeconds);
}

int SyncService::performSync() {
  ESP_LOGI(TAG, "Starting sync cycle...");

  lastSyncCount_ = 0;
  lastSyncSuccess_ = false;

  // Step 1: Connect to WiFi
  ESP_LOGI(TAG, "Connecting to WiFi...");
  esp_err_t err = wifi_.connect();
  if (err != ESP_OK) {
    ESP_LOGE(TAG, "Failed to connect to WiFi");
    return 0;
  }

  // Step 2: Load the file tracker state
  err = fileTracker_.load();
  if (err != ESP_OK) {
    ESP_LOGW(TAG, "Failed to load file tracker (may be first run)");
  }

  // Step 3: Find unprocessed recordings
  std::vector<std::string> unprocessedFiles = findUnprocessedRecordings();
  ESP_LOGI(TAG, "Found %zu unprocessed recording(s)", unprocessedFiles.size());

  if (unprocessedFiles.empty()) {
    ESP_LOGI(TAG, "No files to sync");
    wifi_.disconnect();
    lastSyncSuccess_ = true;
    return 0;
  }

  // Step 4: Upload each file with retry logic
  std::string uploadUrl = buildUploadUrl();
  int successCount = 0;

  for (const auto &filePath : unprocessedFiles) {
    ESP_LOGI(TAG, "Processing: %s", filePath.c_str());

    bool uploaded = false;
    for (uint8_t attempt = 0; attempt < config_.maxRetries && !uploaded; attempt++) {
      if (attempt > 0) {
        ESP_LOGI(TAG, "Retry attempt %d/%d for %s", attempt + 1,
                 config_.maxRetries, filePath.c_str());
        vTaskDelay(pdMS_TO_TICKS(config_.retryDelayMs));
      }

      uploaded = uploadRecording(filePath);
    }

    if (uploaded) {
      // Mark as processed
      err = fileTracker_.markProcessed(filePath.c_str());
      if (err != ESP_OK) {
        ESP_LOGW(TAG, "Failed to mark file as processed: %s", filePath.c_str());
      }
      successCount++;
      ESP_LOGI(TAG, "Successfully uploaded: %s", filePath.c_str());
    }
    else {
      ESP_LOGE(TAG, "Failed to upload after %d attempts: %s", config_.maxRetries,
               filePath.c_str());
    }
  }

  // Step 5: Disconnect WiFi to save power
  ESP_LOGI(TAG, "Disconnecting WiFi to save power...");
  wifi_.disconnect();

  lastSyncCount_ = successCount;
  lastSyncSuccess_ = (successCount == static_cast<int>(unprocessedFiles.size()));

  ESP_LOGI(TAG, "Sync cycle complete: %d/%zu files uploaded", successCount,
           unprocessedFiles.size());

  return successCount;
}

std::vector<std::string> SyncService::findUnprocessedRecordings() {
  std::vector<std::string> unprocessedFiles;

  DIR *dir = opendir(config_.recordingsDir);
  if (dir == nullptr) {
    ESP_LOGE(TAG, "Failed to open recordings directory: %s",
             config_.recordingsDir);
    return unprocessedFiles;
  }

  struct dirent *entry;
  while ((entry = readdir(dir)) != nullptr) {
    // Skip directories and hidden files
    if (entry->d_type == DT_DIR) {
      continue;
    }
    if (entry->d_name[0] == '.') {
      continue;
    }

    // Only process .wav files
    const char *ext = strrchr(entry->d_name, '.');
    if (ext == nullptr || strcmp(ext, ".wav") != 0) {
      continue;
    }

    // Build full path
    std::string fullPath =
        std::string(config_.recordingsDir) + "/" + entry->d_name;

    // Check if already processed
    if (!fileTracker_.isProcessed(fullPath.c_str())) {
      unprocessedFiles.push_back(fullPath);
    }
  }

  closedir(dir);

  return unprocessedFiles;
}

bool SyncService::uploadRecording(const std::string &filePath) {
  std::string uploadUrl = buildUploadUrl();

  // Response buffer for server reply
  char responseBuffer[512] = {0};

  esp_err_t err = HttpClient::uploadFile(uploadUrl.c_str(), filePath.c_str(),
                                         "audio", responseBuffer,
                                         sizeof(responseBuffer));

  if (err != ESP_OK) {
    ESP_LOGE(TAG, "Upload failed for %s: %s", filePath.c_str(),
             esp_err_to_name(err));
    return false;
  }

  int statusCode = HttpClient::getLastStatusCode();
  if (statusCode < 200 || statusCode >= 300) {
    ESP_LOGE(TAG, "Server returned error status %d for %s", statusCode,
             filePath.c_str());
    return false;
  }

  return true;
}

std::string SyncService::buildUploadUrl() const {
  return std::string(config_.serverBaseUrl) + config_.uploadEndpoint;
}

} // namespace sync
