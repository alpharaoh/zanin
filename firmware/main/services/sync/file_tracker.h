#pragma once

#include "esp_err.h"
#include <cstddef>
#include <vector>
#include <string>

namespace sync {

/**
 * Tracks which files have been processed/uploaded.
 * Uses a simple log file on the SD card to persist state.
 */
class FileTracker {
public:
  explicit FileTracker(const char *logFilePath);

  /**
   * Load the list of processed files from disk
   */
  esp_err_t load();

  /**
   * Check if a file has already been processed
   */
  bool isProcessed(const char *filename) const;

  /**
   * Mark a file as processed and persist to disk
   */
  esp_err_t markProcessed(const char *filename);

  /**
   * Get count of processed files
   */
  size_t getProcessedCount() const;

private:
  esp_err_t persist();

  const char *logFilePath_;
  std::vector<std::string> processedFiles_;
};

} // namespace sync
