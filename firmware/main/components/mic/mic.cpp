#include "mic.h"
#include "esp_log.h"

static const char *TAG = "zanin-mic";

Microphone::Microphone(int blckGpioId, int blckDioGpioId, int blckLrclGpioId)
    : blckGpioId(blckGpioId), blckDioGpioId(blckDioGpioId),
      blckLrclGpioId(blckLrclGpioId) {}
