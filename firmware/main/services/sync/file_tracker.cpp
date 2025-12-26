#include "file_tracker.h"
#include "esp_log.h"
#include <algorithm>
#include <cstdio>
#include <cstring>

static const char *TAG = "file-tracker";

namespace sync {

FileTracker::FileTracker(const char *logFilePath) : logFilePath_(logFilePath) {}

esp_err_t FileTracker::load() {
  processedFiles_.clear();

  FILE *f = fopen(logFilePath_, "r");
  if (f == NULL) {
    // File doesn't exist yet - that's fine, no files processed
    ESP_LOGI(TAG, "No processed log file found, starting fresh");
    return ESP_OK;
  }

  char line[256];
  while (fgets(line, sizeof(line), f) != NULL) {
    // Remove trailing newline
    size_t len = strlen(line);
    if (len > 0 && line[len - 1] == '\n') {
      line[len - 1] = '\0';
    }
    if (strlen(line) > 0) {
      processedFiles_.push_back(std::string(line));
    }
  }

  fclose(f);
  ESP_LOGI(TAG, "Loaded %d processed files from log", processedFiles_.size());
  return ESP_OK;
}

bool FileTracker::isProcessed(const char *filename) const {
  return std::find(processedFiles_.begin(), processedFiles_.end(),
                   std::string(filename)) != processedFiles_.end();
}

esp_err_t FileTracker::markProcessed(const char *filename) {
  if (isProcessed(filename)) {
    return ESP_OK; // Already marked
  }

  processedFiles_.push_back(std::string(filename));

  esp_err_t err = persist();
  if (err == ESP_OK) {
    ESP_LOGI(TAG, "Marked as processed: %s", filename);
  }
  return err;
}

esp_err_t FileTracker::persist() {
  FILE *f = fopen(logFilePath_, "w");
  if (f == NULL) {
    ESP_LOGE(TAG, "Failed to open log file for writing: %s", logFilePath_);
    return ESP_FAIL;
  }

  for (const auto &filename : processedFiles_) {
    fprintf(f, "%s\n", filename.c_str());
  }

  fclose(f);
  return ESP_OK;
}

size_t FileTracker::getProcessedCount() const { return processedFiles_.size(); }

} // namespace sync
