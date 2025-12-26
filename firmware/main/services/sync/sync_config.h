#pragma once

#include <cstdint>

namespace sync {

/**
 * Configuration for the sync service
 */
struct SyncConfig {
  // How often to sync (in seconds)
  uint32_t syncIntervalSeconds = 3600; // 1 hour default

  // Server endpoint for uploading recordings
  const char *serverBaseUrl = "http://192.168.0.1:8081";
  const char *uploadEndpoint = "/v1/recordings";

  // SD card paths
  const char *recordingsDir = "/sdcard/recordings";
  const char *processedLogFile = "/sdcard/.processed";

  // Retry settings
  uint8_t maxRetries = 3;
  uint32_t retryDelayMs = 5000;
};

} // namespace sync
