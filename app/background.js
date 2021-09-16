// Declare global variables
var deviceId = 'RaspberryPi';                                                                   //Example device id                                                            
var headerKey = '';                                                                             // API header
var postTimeout = 500;
var maxPostFrequency = 600;
var userMaxInactivity = 1000*60*2;
// API endpoints
var apiBrowsingEndEndPoint = 'https://lopputyo-apim.azure-api.net/api/BrowsingEnd';
var apiBrowsingStartEndPoint = 'https://lopputyo-apim.azure-api.net/api/BrowsingStart';
var raspBerryPiEndPoint = 'https://lopputyo-apim.azure-api.net/api/Raspberry';

// Call post function when tab is changed
chrome.tabs.onActivated.addListener( async function() {
    let lastPostTime = sessionStorage.getItem('lastPostTime');                                  // See when last url data was posted
    if  (new Date() - Date.parse(lastPostTime) >= maxPostFrequency || lastPostTime==null) {     // If last post was less than {maxPostTime} seconds ago then ignore call
        if (lastPostTime==null) {                                                               // If lastPostTime is null (session starts) then create it and save to session
            sessionStorage.setItem('lastPostTime', new Date().toISOString());
        }
        setTimeout(asyncCallTabs, postTimeout);                                                 // Call async method with timeout because tabs data can't be acessed when listener
    }                                                                                           // function is running
});

// Call post function when window focus is changed ### SEE chrome.tabs.onActivated.addListener() function for detailed comments
chrome.windows.onFocusChanged.addListener( async function() {
    let lastPostTime = sessionStorage.getItem('lastPostTime');
    if  (new Date() - Date.parse(lastPostTime) >= maxPostFrequency || lastPostTime==null) {
        if (lastPostTime==null) {
            sessionStorage.setItem('lastPostTime', new Date().toISOString());
        }
        setTimeout(asyncCallTabs, postTimeout);
    }
});

// Call post function when tab url is updated or refreshed ### SEE chrome.tabs.onActivated.addListener() function for detailed comments
chrome.tabs.onUpdated.addListener( async function() {
    let lastPostTime = sessionStorage.getItem('lastPostTime');
    if  (new Date() - Date.parse(lastPostTime) >= maxPostFrequency || lastPostTime==null) {
        if (lastPostTime==null) {
            sessionStorage.setItem('lastPostTime', new Date().toISOString());
        }
        setTimeout(asyncCallTabs, postTimeout);
    }
});

// Function to check if user has been active in {userMaxInactivity} seconds and send request to stop taking pictures if so, runs every 10 seconds
setInterval(() => {
    let lastPostTime = sessionStorage.getItem('lastPostTime');                                  // Get the last post time
    if (new Date() - Date.parse(lastPostTime) >= userMaxInactivity) {                           // Compare the last post time to current time for inactivity period
        let takePictures = sessionStorage.getItem('takePictures');                              // Getet the takePictures variable from session storage and ensure it is false
        if (takePictures != 'false') {                                                          // If not then set then set it to false and call function to stop RP taking pictures
            sessionStorage.setItem('takePictures', 'false')
            var raspData = {                                                                    // raspData is the JSON file sent to IoT hub
                IsCapturing: "false"
            }
            try{
            fetch(raspBerryPiEndPoint, {
                method: 'POST',
                headers: {
                    'Content-Type':'application/json',
                    'Ocp-Apim-Subscription-Key': headerKey
                },
            body:JSON.stringify(raspData)
            })
            }
            catch{
                console.log('Raspberry device not turned on')
            }
              EndSession();
        
            console.log('User has been inactive for 120 seconds => pictures are no longer taken')
        }
    }
}, 1000*10);

// Call RP function when a window is closed ### SEE function above for more detailed comments
chrome.windows.onRemoved.addListener( async function() { 
        sessionStorage.setItem('takePictures', 'false')
        var raspData = {
            IsCapturing: "false",
            DeviceId: deviceId
        }
        try{
        fetch(raspBerryPiEndPoint, {
            method: 'POST',
            headers: {
                'Content-Type':'application/json',
                'Ocp-Apim-Subscription-Key': headerKey
            },
        body:JSON.stringify(raspData)
        })
        }
        catch{
            console.log('Raspberry device not turned on')
        }
        EndSession();
        console.log('IsCapturing set to false')
});


// Call RP function when current window is not focused (when another application is activated/focused)
setInterval(() => {
    chrome.windows.getCurrent(function (window) {
        if (!window.focused && sessionStorage.getItem('takePictures') != 'false') {
            sessionStorage.setItem('takePictures', 'false')
            var raspData = {
                IsCapturing: "false"
            }
            try{
            fetch(raspBerryPiEndPoint, {
                method: 'POST',
                headers: {
                    'Content-Type':'application/json',
                    'Ocp-Apim-Subscription-Key': headerKey
                },
            body:JSON.stringify(raspData)
            })
            }
            catch{
                console.log('Raspberry device not turned on')
            }
             EndSession();
            console.log('Another appication is focused/activated => pictures are no longer taken')
        }
    });
}, 1000*5);


// This function is called when a listener has been activated to post new url data to api and database
function asyncCallTabs() {
    chrome.tabs.getSelected(null, function(tab){                                                // Get the current tab data for the url data
        console.log(tab)
    if  (new Date() - Date.parse(sessionStorage.getItem('lastPostTime')) >= maxPostFrequency) { // If last post time was over {maxPostFrequency} ago, proceed to post new data

        if (localStorage.getItem('SessionId') != 'null'){                                       // End the previous session if the SessionId in localstorage is not null
            EndSession();
        }
        var sessionId = CreateGuid();                                                           // Generate a guid for the session
        localStorage.setItem('SessionId', sessionId);                                           // Save sessionId to localStorage
        currentUrl = tab.url;                                                                   // Save the url to currentUrl
        let domain = (new URL(currentUrl));                                                     // Parse the domain from the url
        domain = domain.hostname.replace('www', '')                                             // Remove the 'www' to make it shorter (and save space)
        getLocation();                                                                          // Get the current location and save it to session storage
        var sessionId = localStorage.getItem('SessionId');                                      // Save sessionId to variable
        var data = {                                                                            // Save item to be saved to the database in JSON format
            Time: new Date(),
            SessionId: sessionId,                                                          
            Domain: domain,
            DeviceId: deviceId,
            Location: sessionStorage.getItem('geolocation')
        }
        console.log(data)

        fetch(apiBrowsingStartEndPoint,                                                         // Post data to database through API & APIM using fetch
        {
            method:'POST',
            headers:{
                'Content-Type':'application/json',
                'Ocp-Apim-Subscription-Key': headerKey                                          // Subscription key has to be here to access send
                    },
            body:JSON.stringify(data)
        })
        .then(function(response) {                                                              // Display messages for debugging purposes
            console.log(response.status)

                
        });
    }
        
    sessionStorage.setItem('lastPostTime', new Date().toISOString());                           // New item has been posted so update lastPostTime
    let takePictures = sessionStorage.getItem('takePictures');                                  // In case takePictures was false then set to true and send message to RP
    if (takePictures != 'true') {                                                               // to keep taking pictures
        sessionStorage.setItem('takePictures', 'true')
        var raspData = {
            IsCapturing: "true"
        }
        console.log(raspData);
        try{
        fetch('https://lopputyo-apim.azure-api.net/api/Raspberry', {                            // This sends RP message to take pictures
            method: 'POST',
            headers: {
                'Content-Type':'application/json',
                'Ocp-Apim-Subscription-Key': headerKey
            },
            body:JSON.stringify(raspData)
            })
        }
        catch (error) {
            console.log('Raspberry device not turned on')
        }
    }
    });
}


// Function to end browsing session of a single webpage. This is called e.g. when user changes domain or closes window
function EndSession() {
    data1 = {                                                                                   // Create package to be sent to database in JSON fromat
        Time: new Date(),
        SessionId: localStorage.getItem('SessionId')
    }
    fetch(apiBrowsingEndEndPoint,                               
    {
        method:'POST',
        headers:{
            'Content-Type':'application/json',
            'Ocp-Apim-Subscription-Key': headerKey
                },
        body:JSON.stringify(data1)
    })
    .then(function(response) {                                                                  // Display messages for debugging purposes
        console.log(response.status);
            
    });
    console.log(data1)
    console.log('Data1: lähetetty');
    localStorage.setItem('SessionId', null)
}

// Function to generate a GUID for sessionId
function CreateGuid() {  
    function _p8(s) {  
       var p = (Math.random().toString(16)+"000000000").substr(2,8);  
       return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;  
    }  
    return _p8() + _p8(true) + _p8(true) + _p8();  
 }  

// The next 2 functions work together to save the geolocation of IP address to session storage
 function getLocation() {
    if (navigator.geolocation) {
      var loc = navigator.geolocation.getCurrentPosition(showPosition);
      return loc;
    } else { 
        console.log("Geolocation not supported");
    }
  }
function showPosition(position) {
      xCoord = Number(position.coords.latitude.toPrecision(4));
      yCoord = Number(position.coords.longitude.toPrecision(4));
    console.log(position.coords);
    sessionStorage.setItem('geolocation', `{"latitude": ${xCoord}, "longitude": ${yCoord}}`)
}