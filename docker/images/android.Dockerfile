# Imagem de toolchain para gerar APK de apps Capacitor 8.
# Contem JDK 21 + Node 22 + Android SDK. NAO copia o projeto — ele e montado em
# runtime (composes de docker/<ambiente>/app e docker/ci). Assim a imagem e generica
# e reutilizavel por varios projetos: nome toolchain-android:<versoes> em todos.
FROM eclipse-temurin:21-jdk-jammy

ENV DEBIAN_FRONTEND=noninteractive

# --- Node 22 -----------------------------------------------------------------
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl unzip git ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# --- Android SDK -------------------------------------------------------------
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_HOME=${ANDROID_SDK_ROOT}
ENV PATH=${PATH}:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools

# Versoes alinhadas ao Capacitor 8 (compileSdk 35).
ARG ANDROID_CMDLINE_TOOLS=11076708
ARG ANDROID_PLATFORM=android-35
ARG ANDROID_BUILD_TOOLS=35.0.0

RUN mkdir -p ${ANDROID_SDK_ROOT}/cmdline-tools \
 && curl -fsSL -o /tmp/cmdtools.zip "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS}_latest.zip" \
 && unzip -q /tmp/cmdtools.zip -d ${ANDROID_SDK_ROOT}/cmdline-tools \
 && mv ${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools ${ANDROID_SDK_ROOT}/cmdline-tools/latest \
 && rm /tmp/cmdtools.zip \
 && yes | sdkmanager --licenses > /dev/null \
 && sdkmanager --install "platform-tools" "platforms;${ANDROID_PLATFORM}" "build-tools;${ANDROID_BUILD_TOOLS}" > /dev/null

WORKDIR /workspace
