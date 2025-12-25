#pragma once

#include "esp_err.h"
#include "sdmmc_cmd.h"
#include "soc/gpio_num.h"

#define MOUNT_POINT "/sdcard"

class SDCard {
public:
  SDCard(gpio_num_t misoGPIO, gpio_num_t clkGPIO, gpio_num_t mosiGPIO,
         gpio_num_t csGPIO);

  bool isMounted() const { return mounted; }
  const char *getMountPoint() const { return MOUNT_POINT; }

private:
  gpio_num_t misoGPIO; // DO - Data Out from SD card
  gpio_num_t clkGPIO;
  gpio_num_t mosiGPIO; // DI - Data In to SD card
  gpio_num_t csGPIO;
  sdmmc_card_t *card = nullptr;
  bool mounted = false;
};
