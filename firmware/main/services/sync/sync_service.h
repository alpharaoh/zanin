#pragma once

#include "components/wifi/wifi.h"
#include "file_tracker.h"
#include "sync_config.h"
#include <string>
#include <vector>

namespace sync {

/**
 * SyncService orchestrates the periodic sync operation:
 * 1. Connect to WiFi
 * 2. Find unprocessed recordings
 * 3. Upload them to the server
 * 4. Mark them as processed
 * 5. Disconnect WiFi to save power
 */
class SyncService {
public:
  /**
   * Create a sync service with the given configuration
   * @param config Sync configuration
   * @param wifi WiFi manager instance
   */
  SyncService(const SyncConfig &config, Wifi &wifi);

  /**
   * Perform a single sync cycle
   * @return Number of files successfully uploaded
   */
  int performSync();

  /**
   * Get the configured sync interval in seconds
   */
  uint32_t getSyncIntervalSeconds() const {
    return config_.syncIntervalSeconds;
  }

  /**
   * Get the number of files uploaded in the last sync
   */
  int getLastSyncCount() const { return lastSyncCount_; }

  /**
   * Check if the last sync was successful
   */
  bool wasLastSyncSuccessful() const { return lastSyncSuccess_; }

private:
  /**
   * Find all recording files that haven't been processed yet
   */
  std::vector<std::string> findUnprocessedRecordings();

  /**
   * Upload a single recording file
   * @return true on success
   */
  bool uploadRecording(const std::string &filePath);

  /**
   * Build the full upload URL
   */
  std::string buildUploadUrl() const;

  SyncConfig config_;
  Wifi &wifi_;
  FileTracker fileTracker_;

  int lastSyncCount_ = 0;
  bool lastSyncSuccess_ = false;
};

} // namespace sync
