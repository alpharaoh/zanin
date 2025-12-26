#pragma once

#include "esp_err.h"
#include "esp_event_base.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"

/**
 * WiFi manager class with connect/disconnect capabilities
 * for power-saving sync operations.
 */
class Wifi {
public:
  /**
   * Initialize WiFi subsystem (call once at startup)
   */
  Wifi();

  /**
   * Connect to the configured WiFi network
   * Blocks until connected or max retries exceeded
   * @return ESP_OK on success, ESP_FAIL on failure
   */
  esp_err_t connect();

  /**
   * Disconnect from WiFi and stop the WiFi driver to save power
   */
  void disconnect();

  /**
   * Check if currently connected
   */
  bool isConnected() const { return connected_; }

  /**
   * Check if WiFi subsystem is initialized
   */
  bool isInitialized() const { return initialized_; }

private:
  static void eventHandler(void *arg, esp_event_base_t event_base,
                           int32_t event_id, void *event_data);

  esp_err_t waitForConnection();

  static EventGroupHandle_t s_wifi_event_group;
  static int s_retry_num;
  static bool connected_;

  bool initialized_ = false;
};
