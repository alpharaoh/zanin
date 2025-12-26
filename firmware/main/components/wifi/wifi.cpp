#include "wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "esp_netif.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "freertos/task.h"
#include "nvs_flash.h"

#include "lwip/err.h"
#include "lwip/sys.h"

#include <cstring>

static const char *TAG = "zanin-wifi";

// WiFi credentials - consider moving to menuconfig or NVS for production
static const char *WIFI_SSID = "A's router";
static const char *WIFI_PASS = "kmzcnxLn59gd";
static const int MAX_RETRY = 4;

// Event bits
static const int WIFI_CONNECTED_BIT = BIT0;
static const int WIFI_FAIL_BIT = BIT1;

// Static member definitions
EventGroupHandle_t Wifi::s_wifi_event_group = nullptr;
int Wifi::s_retry_num = 0;
bool Wifi::connected_ = false;

void Wifi::eventHandler(void *arg, esp_event_base_t event_base,
                        int32_t event_id, void *event_data) {
  if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
    esp_wifi_connect();
  }
  else if (event_base == WIFI_EVENT &&
           event_id == WIFI_EVENT_STA_DISCONNECTED) {
    connected_ = false;
    if (s_retry_num < MAX_RETRY) {
      esp_wifi_connect();
      s_retry_num++;
      ESP_LOGI(TAG, "Retrying connection to AP (attempt %d/%d)", s_retry_num,
               MAX_RETRY);
    }
    else {
      xEventGroupSetBits(s_wifi_event_group, WIFI_FAIL_BIT);
      ESP_LOGW(TAG, "Failed to connect after %d attempts", MAX_RETRY);
    }
  }
  else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
    ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
    ESP_LOGI(TAG, "Got IP: " IPSTR, IP2STR(&event->ip_info.ip));
    s_retry_num = 0;
    connected_ = true;
    xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
  }
}

Wifi::Wifi() {
  ESP_LOGI(TAG, "Initializing WiFi subsystem");

  // Initialize NVS (required for WiFi)
  esp_err_t ret = nvs_flash_init();
  if (ret == ESP_ERR_NVS_NO_FREE_PAGES ||
      ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
    ESP_ERROR_CHECK(nvs_flash_erase());
    ret = nvs_flash_init();
  }
  ESP_ERROR_CHECK(ret);

  // Create event group for synchronization
  s_wifi_event_group = xEventGroupCreate();

  // Initialize TCP/IP stack
  ESP_ERROR_CHECK(esp_netif_init());
  ESP_ERROR_CHECK(esp_event_loop_create_default());
  esp_netif_create_default_wifi_sta();

  // Initialize WiFi with default config
  wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
  ESP_ERROR_CHECK(esp_wifi_init(&cfg));

  // Register event handlers
  esp_event_handler_instance_t instance_any_id;
  esp_event_handler_instance_t instance_got_ip;
  ESP_ERROR_CHECK(esp_event_handler_instance_register(
      WIFI_EVENT, ESP_EVENT_ANY_ID, &eventHandler, NULL, &instance_any_id));
  ESP_ERROR_CHECK(esp_event_handler_instance_register(
      IP_EVENT, IP_EVENT_STA_GOT_IP, &eventHandler, NULL, &instance_got_ip));

  // Configure WiFi station
  wifi_config_t wifi_config = {};
  strncpy((char *)wifi_config.sta.ssid, WIFI_SSID,
          sizeof(wifi_config.sta.ssid) - 1);
  strncpy((char *)wifi_config.sta.password, WIFI_PASS,
          sizeof(wifi_config.sta.password) - 1);
  wifi_config.sta.threshold.authmode = WIFI_AUTH_WPA2_PSK;

  ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
  ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));

  initialized_ = true;
  ESP_LOGI(TAG, "WiFi subsystem initialized");
}

esp_err_t Wifi::connect() {
  if (!initialized_) {
    ESP_LOGE(TAG, "WiFi not initialized");
    return ESP_FAIL;
  }

  if (connected_) {
    ESP_LOGI(TAG, "Already connected");
    return ESP_OK;
  }

  ESP_LOGI(TAG, "Connecting to WiFi...");

  // Reset retry counter and event bits
  s_retry_num = 0;
  xEventGroupClearBits(s_wifi_event_group, WIFI_CONNECTED_BIT | WIFI_FAIL_BIT);

  // Start WiFi
  esp_err_t err = esp_wifi_start();
  if (err != ESP_OK) {
    ESP_LOGE(TAG, "Failed to start WiFi: %s", esp_err_to_name(err));
    return err;
  }

  return waitForConnection();
}

esp_err_t Wifi::waitForConnection() {
  // Wait for connection result
  EventBits_t bits = xEventGroupWaitBits(
      s_wifi_event_group, WIFI_CONNECTED_BIT | WIFI_FAIL_BIT, pdFALSE, pdFALSE,
      pdMS_TO_TICKS(30000)); // 30 second timeout

  if (bits & WIFI_CONNECTED_BIT) {
    ESP_LOGI(TAG, "Connected to SSID: %s", WIFI_SSID);
    return ESP_OK;
  }
  else if (bits & WIFI_FAIL_BIT) {
    ESP_LOGW(TAG, "Failed to connect to SSID: %s", WIFI_SSID);
    return ESP_FAIL;
  }
  else {
    ESP_LOGE(TAG, "Connection timeout");
    return ESP_ERR_TIMEOUT;
  }
}

void Wifi::disconnect() {
  if (!connected_) {
    ESP_LOGI(TAG, "Already disconnected");
    return;
  }

  ESP_LOGI(TAG, "Disconnecting from WiFi...");

  esp_wifi_disconnect();
  esp_wifi_stop();

  connected_ = false;
  ESP_LOGI(TAG, "WiFi disconnected and stopped");
}
