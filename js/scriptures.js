/*===================================================================
* FILE:     scriptures.js
* AUTHOR:   Peter Garrow
* Date:     Winter 2019
*
* DESCRIPTION: Front-end JavaScript code for The Scriptures, Mapped.
                IS 542, Winter 2019, Byu.
*
*/
/*property
    forEach, onerror, onload, open, parse, responseText, send, status
*/

/*global console */
/*jslint
    browser: true
    long: true
*/

const scriptures = (function () {
    "use strict";

    /*---------------------------------------------------------------
    *                       CONSTANTS
    */
   const INDEX_PLACENAME = 2;
   const INDEX_LATITUDE = 3;
   const INDEX_LONGITUDE = 4;
   const INDEX_PLACE_FLAG = 11;
   const LAT_LON_PARSER = /\((.*),'(.*)',(.*),(.*),(.*),(.*),(.*),(.*),(.*),(.*),'(.*)'\)/;
   const MAX_RETRY_DELAY = 5000;
//    const NAV_BUTTONS = document.createElement(`<div id='navButtons'></div>`);
   const REQUEST_GET = "GET";
   const REQUEST_STATUS_OK = 200;
   const REQUEST_STATUS_ERROR = 400;
   const SCRIPTURES_URL = "https://scriptures.byu.edu/mapscrip/mapgetscrip.php";

    /*---------------------------------------------------------------
    *                       PRIVATE VARIABLES
    */
    let books;
    let gmMarkers = [];
    let retryDelay = 500;
    let volumes;

    /*---------------------------------------------------------------
    *                       PRIVATE METHOD DECLARATIONS
    */
   let addMarker;
   let ajax;
   let bookChapterValid;
   let cacheBooks;
   let changeHash;
   let clearMarkers;
   let encodedScriptureUrlParameters;
   let getScriptureCallback;
   let getScriptureFailed;
   let init;
   let navigateBook;
   let navigateChapter;
   let navigateHome;
   let nextChapter;
   let onHashChanged;
   let previousChapter;
   let setupBounds;
   let setupMarkers;
   let showLocation;
   let titleForBookChapter;

    /*---------------------------------------------------------------
    *                       PRIVATE METHODS
    */

    addMarker = function (placename, latitude, longitude) {
      // NEEDS WORK: check to see if we already have this lat/long
      //    in gmMarkers. If so, merge this new placename
        let duplicates = false;
        let myLatLng = new google.maps.LatLng(latitude, longitude);

        gmMarkers.forEach(marker => {
            if (marker.position.lat() === myLatLng.lat() && marker.position.lng() === myLatLng.lng()) {
                if (!marker.title.includes(placename)) {
                    marker.title += `, ${placename}`;
                }
                duplicates = true;
            }
        });

        if (!duplicates) {
            // NEEDSWORK: create the marker and append it to gmMarkers;

            let marker = new google.maps.Marker({
                position: {lat: latitude, lng: longitude},
                map: map,
                title: placename,
                label: {
                    color: '#201000',
                    strokeColor: '#fff8f0',
                    fontWeight: 'bold',
                    text: placename
                  },
                animation: google.maps.Animation.DROP
            });

            // console.log(gmMarkers);

            gmMarkers.push(marker);
        }

      
    };

    ajax = function (url, successCallback, failureCallback, skipParse) {
        let request = new XMLHttpRequest();

        request.open(REQUEST_GET, url, true);
        request.onload = function() {
            if (request.status >= REQUEST_STATUS_OK && request.status < REQUEST_STATUS_ERROR) {
                
                let data = skipParse ? request.responseText : JSON.parse(request.responseText);

                if (typeof successCallback === "function") {
                    successCallback(data);
                }
            } else {
                if (typeof failureCallback === "function") {
                    failureCallback(request);
                }
            }
        };

        request.onerror = failureCallback;
        request.send();
    };

    bookChapterValid = function(bookId, chapter) {
        let book = books[bookId];

        if (book === undefined || chapter < 0 || chapter > book.numChapters) {
            return false;
        }

        if (chapter === 0 && book.numChapters > 0) {
            return false;
        }

        return true;
    }

    cacheBooks = function (callback) {
        volumes.forEach(volume => {
            let volumeBooks = [];
            let bookId = volume.minBookId;

            while (bookId <= volume.maxBookId) {
                volumeBooks.push(books[bookId]);
                bookId += 1;
            }

            volume.books = volumeBooks;
        });

        if (typeof callback === "function") {
            callback();
        }
    };

    clearMarkers = function () {
        gmMarkers.forEach(marker => {
            marker.setMap(null);
        });

        gmMarkers = [];
    };

    encodedScriptureUrlParameters = function(bookId, chapter, verses, isJst) {
        // console.log('encoded');
        if (bookId !== undefined && chapter !== undefined) {
            let options = "";

            if (verses !== undefined) {
                options += verses;
            }

            if (isJst !== undefined && isJst) {
                options += '&jst=JST';
            }

            return `${SCRIPTURES_URL}?book=${bookId}&chap=${chapter}&verses${options}`;
        }
    };

    getScriptureCallback = function (chapterHTML) {
        document.querySelector('#scriptures').innerHTML = chapterHTML;
        setupMarkers();
    };

    getScriptureFailed = function() {
        console.log("Warning: unable to receive scripture content from server.");
    };

    init = function (callback) {
        let booksLoaded = false;
        let volumesLoaded = false;
        ajax("https://scriptures.byu.edu/mapscrip/model/books.php",
            data => {
                books = data;
                booksLoaded = true;

                if (volumesLoaded) {
                    cacheBooks(callback);
                }
            }
        );

        ajax("https://scriptures.byu.edu/mapscrip/model/volumes.php",
            data => {
                volumes = data;
                volumesLoaded = true;

                if (booksLoaded) {
                    cacheBooks(callback);
                }
            }
        );
    };

    navigateBook = function (bookId) {
        // document.getElementById('scriptures').innerHTML = `<div>${bookId}</div>`;
        
        let book = books[bookId];

        if (book.numChapters === 0 ) {
            navigateChapter(bookId, 0);
        } else if (book.numChapters === 1) {
            navigateChapter(bookId, 1);
        } else {
            let content = `<div id="scripnav">
                                <div class='volume'>
                                    <h5>${book.fullName}</h5>
                                </div>
                                <div class='books'>`;

            for (let i = 0; i < book.numChapters; i++) {
                content += `<a class='btn chapter' id=${i} href='#${book.parentBookId}:${bookId}:${i + 1}'>${i + 1}</a>`;
            }

            content += '</div></div>';
            document.getElementById('scriptures').innerHTML = content;
        }        
    }

    navigateChapter = function(bookId, chapter) {
        if (bookId !== undefined) {
            let book = books[bookId];
            let volume = volumes[book.parentBookId - 1];

            ajax(encodedScriptureUrlParameters(bookId, chapter),
                    getScriptureCallback, getScriptureFailed, true);

            
            document.querySelector('#navButtons').innerHTML = `<div id='prev'>
                                                                    <i class="material-icons">
                                                                    navigate_before
                                                                    </i>
                                                               </div>
                                                               <div id='next'>
                                                                    <i class="material-icons">
                                                                    navigate_next
                                                                    </i>
                                                               </div>`;

            document.querySelector('#next').addEventListener('click', () => {
                let next = nextChapter(bookId, chapter);
                if (next !== undefined) {
                    location.hash = `#${next[0]}:${next[1]}:${next[2]}`;
                } else {
                    navigateHome();
                }
            });
    
            document.querySelector('#prev').addEventListener('click', () => {
                let prev = previousChapter(bookId, chapter);
                if (prev !== undefined) {
                    location.hash = `#${prev[0]}:${prev[1]}:${prev[2]}`;
                } else {
                    navigateHome();
                }
            });
        }

        
    }

    navigateHome = function (volumeId) {
        let navContents = "<div id='scriptNav'>";
        volumes.forEach(volume => {
            if (volumeId === undefined || volumeId === volume.id) {
                navContents += `<div class='volume'>
                                <a name='v${volume.id}' >
                                    <h5>${volume.fullName}</h5>
                                </a>
                                <div class='books'>`;
                volume.books.forEach(book => {
                    navContents += `<a class='btn' id='${book.id}' href='#${volume.id}:${book.id}'>${book.gridName}</a>`;
                });
                navContents += `</div>`;
            }
            
        });
        navContents += "<br /><br /></div>"
        document.querySelector('#scriptures').innerHTML = navContents;
        // document.querySelector("#scriptures").innerHTML = 
        // "<div>The Old Testament</div><div>The New Testament</div><div>The Book of Mormon</div>" +
        // "<div>Doctrine and Covenants</div><div>The Pearl of Great Price</div>" + volumeId;
    };

    // Book ID and chapter must be integers
    // Returns undefined if there is no next chapter
    // Otherwise returns an array with the next book ID, chapter, and title
    nextChapter = function(bookId, chapter) {
        let book = books[bookId];

        if (book !== undefined) {
            if (chapter < book.numChapters) {
                return [
                    book.parentBookId,
                    bookId,
                    chapter + 1,
                    titleForBookChapter(book, chapter + 1)
                ];
            }

            let nextBook = books[bookId + 1];

            if (nextBook !== undefined) {
                let nextChapterValue = 0;
                if (nextBook.numChapters > 0) {
                    nextChapterValue = 1;
                }

                return [
                    nextBook.parentBookId,
                    nextBook.id,
                    nextChapterValue,
                    titleForBookChapter(nextBook, nextChapterValue)
                ];
            }
        }
        /*
         * Get the book for the given bookId. If it's not undefined
         *      If chapter < max for this book, it's the easy case. Just return
         *          same bookId, chapter + 1, and the title string for that
         *          book/chapter combo
         *      otherwise we need to see if there's a next book:
         *          Get the book for bookId + 1. If it's no undefined:
         *              Check whether that next book has 0 chapters or > 0.
         *              If 0, return next book ID, 0, and the corresponding title string
         *              Else return next Book ID, 1, and the corresponding title string.
         *  If we didn't already return a 3-element array of bookId/chatper/title,
         *      at this point just drop through to the bottom of the function. We'll
         *      return undefined by default, meaning there is no next chapter
        */
    }

    onHashChanged = function () {
        let ids = [];

        if (location.hash !== "" && location.hash.length > 1) {
            ids = location.hash.substring(1).split(":");
        }

        if (ids.length <= 0) {
            navigateHome();
        } else if (ids.length === 1) {
            let volumeId = Number(ids[0]);

            if (volumeId < volumes[0].id || volumeId > volumes.slice(-1).id) {
                navigateHome();
            } else {
                navigateHome(volumeId);
            }
        } else if (ids.length >= 2) {
            let bookId = Number(ids[1]);

            if (books[bookId] === undefined) {
                navigateHome();
            } else {
                if (ids.length === 2) {
                    navigateBook(bookId);
                } else {
                    let chapter = Number(ids[2]);

                    if (bookChapterValid(bookId, chapter)) {
                        navigateChapter(bookId, chapter)
                    } else {
                        navigateHome();
                    }
                }
            }
        }
    };

    // Book Id and chapter must be integers
    // Returns undefined if there is no previous chapter
    // Otherwise returns an array with the next book ID, chapter, and title
    previousChapter = function (bookId, chapter) {
        let book = books[bookId];

        if (book !== undefined) {
            if (chapter > 1) {
                return [
                    book.parentBookId,
                    bookId,
                    chapter - 1,
                    titleForBookChapter(book, chapter - 1)
                ];
            } else {
                let prevBook = books[bookId - 1];

                if (prevBook !== undefined) {
                    return [
                        prevBook.parentBookId,
                        prevBook.id,
                        prevBook.numChapters,
                        titleForBookChapter(prevBook, prevBook.numChapters)
                    ]
                }
            }
        }
        /*
         * Get the book for the given bookId. If it's not undefined:
         *  If chapter > 1, it's the easy case. Just return same bookId,
         *      chapter - , and the title string for that book/chapter combo
         *  Otherwise we need to see if there's a previous book:
         *      Get the book for bookId - 1. If it's not undefinied:
         *          Return bookId - 1, the last chapter of that book, and the
         *              title string for that book/chapter combo
         * If we didn't already return a 3-element array of bookId/chapter/title,
         *      at this point just drop through to the boom of the function. We'll
         *      return undefinied by default meaning there is no previous chapter.
        */
    };

    setupBounds = function () {
        if (gmMarkers.length === 0) {
            map.setZoom(8);
            map.panTo({lat: 31.777444, lng: 35.234935});
        }

        if(gmMarkers.length === 1) {
            map.setZoom(8);
            map.panTo(gmMarkers[0].position);
        }        

        if (gmMarkers.length > 1) {
            let bounds = new google.maps.LatLngBounds();
            gmMarkers.forEach(marker => {
                bounds.extend(marker.getPosition());
            });

            map.fitBounds(bounds);

            // The code above was adapted by code from: https://stackoverflow.com/questions/19304574/center-set-zoom-of-map-to-cover-all-visible-markers
            // Submitted by user: https://stackoverflow.com/users/954940/adam
        }
    }

    setupMarkers = function () {
        if (window.google === undefined) {
            // retry fater delay
            let retryId = window.setTimeout(setupMarkers, retryDelay);

            retryDelay += retryDelay;
            if (retryDelay > MAX_RETRY_DELAY) {
                window.clearTimeout(retryId);
            }

            return;
        }

        if (gmMarkers.length > 0) {
            clearMarkers();
        }

        document.querySelectorAll('a[onclick^="showLocation("]').forEach(el => {
            let matches = LAT_LON_PARSER.exec(el.getAttribute("onclick"));

            if (matches) {
                let placename = matches[INDEX_PLACENAME];
                let latitude = parseFloat(matches[INDEX_LATITUDE]);
                let longitude = parseFloat(matches[INDEX_LONGITUDE]);
                let flag = matches [INDEX_PLACE_FLAG];

                if  (flag !== "") {
                    placename += " " + flag;
                }

                addMarker(placename, latitude, longitude);
            }
        });

        // console.log(gmMarkers);

        setupBounds();
    };

    showLocation = function (geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading) {
        gmMarkers.forEach(marker => {
            let myLatLng = new google.maps.LatLng(latitude, longitude);

            if (marker.position.lat() === myLatLng.lat() && marker.position.lng() === myLatLng.lng()) {
                let zoom = Math.round(Number(viewAltitude) / 450);
                6 > zoom ? zoom = 6 : 18 < zoom && (zoom = 18);

                // if (zoom < 6) {
                //     zoom = 6;
                // } else if (zoom > 18) {
                //     zoom = 18;
                // }
                // b = Math.round(Number(a[9]) / 450),
                // 6 > b ? b = 6 : 18 < b && (b = 18),
                map.setZoom(zoom);
                map.panTo(marker.position);
            }
        });
    }

    titleForBookChapter = function (book, chapter) {
        if (chapter > 0){
            return `${book.tocName} ${chapter}`;
        }

        return book.tocName;
    };

    /*---------------------------------------------------------------
    *                       PUBLIC API
    */

    return {
        init,
        onHashChanged,
        showLocation
    }

}());
