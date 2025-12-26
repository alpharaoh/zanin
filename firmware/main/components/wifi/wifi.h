#pragma once

#include "esp_event_base.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"

class Wifi {
public:
  Wifi();

  bool isConnected() const { return connected; }

private:
  static void eventHandler(void *arg, esp_event_base_t event_base,
                           int32_t event_id, void *event_data);

  static EventGroupHandle_t s_wifi_event_group;
  static int s_retry_num;
  bool connected = false;
};
