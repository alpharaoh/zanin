#include "components/led/led.h"
#include "components/mic/mic.h"
#include "components/sdcard/sdcard.h"
#include "components/wifi/wifi.h"
#include "services/sync/sync_service.h"
#include <stdio.h>

#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "zanin-main";

// GPIO Configuration
const gpio_num_t LED_GPIO_ID = GPIO_NUM_38;

const gpio_num_t MIC_DOUT_GPIO_ID = GPIO_NUM_15;
const gpio_num_t MIC_BLCK_GPIO_ID = GPIO_NUM_16;
const gpio_num_t MIC_LRCL_GPIO_ID = GPIO_NUM_17;

const gpio_num_t SD_CARD_DO_GPIO_ID = GPIO_NUM_35;
const gpio_num_t SD_CARD_CLK_GPIO_ID = GPIO_NUM_36;
const gpio_num_t SD_CARD_DI_GPIO_ID = GPIO_NUM_37;
const gpio_num_t SD_CARD_CS_GPIO_ID = GPIO_NUM_39;

extern "C" void app_main() {
  ESP_LOGI(TAG, "=== Zanin Firmware Starting ===");

  // Initialize SD Card (required for recordings storage)
  ESP_LOGI(TAG, "Initializing SD card...");
  SDCard sdcard(SD_CARD_DO_GPIO_ID, SD_CARD_CLK_GPIO_ID, SD_CARD_DI_GPIO_ID,
                SD_CARD_CS_GPIO_ID);

  if (!sdcard.isMounted()) {
    ESP_LOGE(TAG, "SD card mount failed! Sync service cannot operate.");
    return;
  }
  ESP_LOGI(TAG, "SD card mounted successfully");

  // Initialize WiFi subsystem (does not connect yet)
  ESP_LOGI(TAG, "Initializing WiFi subsystem...");
  Wifi wifi;
  if (!wifi.isInitialized()) {
    ESP_LOGE(TAG, "WiFi initialization failed!");
    return;
  }
  ESP_LOGI(TAG, "WiFi subsystem initialized");

  // Configure sync service
  sync::SyncConfig syncConfig;
  syncConfig.syncIntervalSeconds = 3600; // 1 hour
  syncConfig.serverBaseUrl = "http://192.168.0.105:8081";
  syncConfig.uploadEndpoint = "/v1/recordings";
  syncConfig.recordingsDir = "/sdcard/recordings";
  syncConfig.processedLogFile = "/sdcard/.processed";
  syncConfig.maxRetries = 3;
  syncConfig.retryDelayMs = 5000;

  // Create sync service
  sync::SyncService syncService(syncConfig, wifi);

  ESP_LOGI(TAG, "=== Starting Main Loop ===");
  ESP_LOGI(TAG, "Sync interval: %lu seconds", syncConfig.syncIntervalSeconds);

  // Main sync loop
  while (true) {
    ESP_LOGI(TAG, "--- Starting sync cycle ---");

    int uploadedCount = syncService.performSync();

    if (syncService.wasLastSyncSuccessful()) {
      ESP_LOGI(TAG, "Sync completed successfully. Uploaded %d file(s)",
               uploadedCount);
    } else {
      ESP_LOGW(TAG, "Sync completed with errors. Uploaded %d file(s)",
               uploadedCount);
    }

    // Wait until next sync interval
    ESP_LOGI(TAG, "Next sync in %lu seconds",
             syncService.getSyncIntervalSeconds());
    vTaskDelay(pdMS_TO_TICKS(syncService.getSyncIntervalSeconds() * 1000));
  }
}
