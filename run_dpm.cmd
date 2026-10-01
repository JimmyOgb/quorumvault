@echo off
set "JAVA_HOME=C:\Users\NO GO NO\jdk-17\jdk-17.0.20.1+1"
set "PATH=%JAVA_HOME%\bin;C:\Users\NO GO NO\.local\bin;%PATH%"
java -version
dpm %*
