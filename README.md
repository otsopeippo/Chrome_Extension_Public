# Chrome_Extension_Public
Chrome extension that sends users browsing data (including website domains, location and time user was active) to database and communicates with a RaspberryPi device to start or stop taking pictures.


Start from here:

1. Download the app folder
2. Start chrome and go to chrome://extensions/
3. Set developer mode on
4. Click load unpacked in the top bar
5. In the window that opened select the app folder that you just downloaded
6. In the chrome window turn the extension you just downloaded on and open the background page
7. Follow the log from the background page to see what is happening

manifest.json file contains all the premissions that the extension needs to work (api endpoints, function endpoints, tabs api access, geolocation...).

background.js file contains all the actions of the extension. The listeners and timed functions follow if there is a new event that requires a new data line to be sent to the API or the RaspberryPi. The AsyncCallTabs function is the one that communicates with the database to update the startUrl and the endUrl. When new data is posted the last post time is checked from session storage and if less than a 0.X second ago, there will not be data sent (prevents high frecuency overloading). When the browsing session ends (e.g. user closes window) the extension checks from local storage if takePictures is true and if so it changes it to false and sends the RaspbarryPi a message to stop taking pictures through an azure function.
