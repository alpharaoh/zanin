file(GLOB_RECURSE COMPONENT_SRCS "components/**/*.cpp")
file(GLOB_RECURSE SERVICE_SRCS "services/**/*.cpp")

idf_component_register(SRCS "zanin-firmware.cpp"
                            ${COMPONENT_SRCS}
                            ${SERVICE_SRCS}
                    INCLUDE_DIRS ".")
