#include <iostream>
#include <stdio.h>

#include "components/led/led.h"
#include "components/mic/mic.h"
#include "components/sdcard/sdcard.h"

#include "components/wifi/wifi.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "led_strip.h"

const gpio_num_t LED_GPIO_ID = GPIO_NUM_38;

const gpio_num_t MIC_DOUT_GPIO_ID = GPIO_NUM_15;
const gpio_num_t MIC_BLCK_GPIO_ID = GPIO_NUM_16;
const gpio_num_t MIC_LRCL_GPIO_ID = GPIO_NUM_17;

const gpio_num_t SD_CARD_DO_GPIO_ID = GPIO_NUM_35;
const gpio_num_t SD_CARD_CLK_GPIO_ID = GPIO_NUM_36;
const gpio_num_t SD_CARD_DI_GPIO_ID = GPIO_NUM_37;
const gpio_num_t SD_CARD_CS_GPIO_ID = GPIO_NUM_38;

extern "C" void app_main() {
  Wifi wifi = Wifi();

  SDCard sdcard = SDCard(SD_CARD_DO_GPIO_ID, SD_CARD_CLK_GPIO_ID,
                         SD_CARD_DI_GPIO_ID, SD_CARD_CS_GPIO_ID);

  sdcard.write("/test.txt", "Hello world!");

  char buffer[100];

  sdcard.read("/test.txt", buffer, 100);

  // Led led = Led(LED_GPIO_ID);
  //
  // while (true) {
  //   if (!led.isOn()) {
  //     led.setColor(5, 0, 0);
  //   } else {
  //     led.turnOff();
  //   }
  //
  //   vTaskDelay(pdMS_TO_TICKS(2000));
  // }
}
