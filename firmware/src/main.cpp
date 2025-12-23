#include "main.h"
#include <iostream>
#include <thread>

const int MAX_COUNT = 500;

Count::Count() : count(0), state(ControlLoopState::Idle) {}

void Count::increment() { count.fetch_add(1); }

void Count::setState(ControlLoopState s) { state.store(s); }

int Count::getCount() { return count.load(); }

ControlLoopState Count::getState() { return state.load(); }

void controlLoop(Count &count) {
  count.setState(ControlLoopState::Running);

  while (true) {
    ControlLoopState currentState = count.getState();

    if (currentState == ControlLoopState::Finished) {
      break;
    }

    if (currentState == ControlLoopState::Stopped) {
      break;
    }

    if (currentState == ControlLoopState::Running) {
      count.increment();
      std::cout << "Loop count: " << count.getCount() << std::endl;
    }

    std::this_thread::sleep_for(std::chrono::seconds(2));
  };

  count.setState(ControlLoopState::Finished);
}

void inputLoop(Count &count) {
  std::string word;

  while (count.getCount() < MAX_COUNT) {
    if (count.getState() == ControlLoopState::Finished) {
      break;
    }

    std::cin >> word;

    if (word == "stop") {
      count.setState(ControlLoopState::Stopped);
    }
  }
}

int main() {
  Count count;

  std::thread controlLoopThread(controlLoop, std::ref(count));
  std::thread inputLoopThread(inputLoop, std::ref(count));

  controlLoopThread.join();
  inputLoopThread.join();

  std::cout << "Final count: " << count.getCount() << std::endl;

  return 0;
};
