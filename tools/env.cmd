@echo off
rem Puts the project-local Node on PATH for this window. Usage: tools\env.cmd
set "PATH=%~dp0..\.tools\node;%~dp0..\node_modules\.bin;%PATH%"
set PYTHONUTF8=1
