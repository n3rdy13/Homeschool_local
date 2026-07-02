@echo off
echo Starting the development server...

:: Start the npm server in a separate window so it doesn't block the script
start "Dev Server" cmd /k "npm run dev"

echo Waiting for the server to spin up...
:: Wait 5 seconds to ensure the server is ready. Adjust this number if your app loads faster or slower.
timeout /t 5 /nobreak >nul

echo Opening the browser...
:: Opens the default browser to your local environment. 
:: IMPORTANT: Change the port (3000) if your framework uses a different one (e.g., Vite often uses 5173).
start http://localhost:3000