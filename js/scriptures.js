/*===================================================================
* FILE:     scriptures.js
* AUTHOR:   Peter Garrow
* Date:     Winter 2019
*
* DESCRIPTION: Front-end JavaScript code for The Scriptures, Mapped.
                IS 542, Winter 2019, Byu.
*
*/

const scriptures = (function () {
    "use strict";

    /*---------------------------------------------------------------
    *                       CONSTANTS
    */

    /*---------------------------------------------------------------
    *                       PRIVATE VARIABLES
    */
    let books;
    let volumes;

    /*---------------------------------------------------------------
    *                       PRIVATE METHOD DECLARATIONS
    */
   let ajax;
   let cacheBooks;
   let init;
   let navigateHome;
   let onHashChanged;

    /*---------------------------------------------------------------
    *                       PRIVATE METHODS
    */

    ajax = function (url, successCallback, failureCallback) {
        let request = new XMLHttpRequest();

        request.open('GET', url, true);

        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                let data = JSON.parse(request.responseText);

                if (typeof successCallback === 'function') {
                    successCallback(data);
                }
            } else {
                if (typeof failureCallback === 'function') {
                    failureCallback(request);
                }
            }
        };

        request.onerror = failureCallback;
        request.send();
    };

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

        if (typeof callback === 'function') {
            callback();
        }
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

    navigateHome = function (volumeId) {
        document.querySelector("#scriptures").innerHTML = 
        "<div>The Old Testament</div><div>The New Testament</div><div>The Book of Mormon</div>" +
        "<div>Doctrine and Covenants</div><div>The Pearl of Great Price</div>" + volumeId;
    };

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
        } else if (ids.length === 2) {
            let bookId = Number(ids[1]);

            if (books[bookId] === undefined) {
                navigateHome();
            } else {
                navigateBook(bookId);
            }
        } else {

        }

        /*
         Check the hash to see if it’s empty; if so, navigate to the “home” state
         Trim the leading “#” and then split the hash based on colons (“:”)
         If we have one ID, it’s a volume, so navigate to that volume
             But if the volume ID is < 1 or > 5, it’s invalid, so navigate to “home”
         If we have two ID’s, it’s a volume and book, so navigate to that book’s list of chapters
             But if the volume or book ID is invalid, navigate “home”
             If the book doesn’t have chapters, navigate to its content directly
         If we have three ID’s, its volume, book, chapter, so navigate there if valid
             If invalid, navigate “home”
         */
    };

    /*---------------------------------------------------------------
    *                       PUBLIC API
    */

    return {
        init
    }

}());
