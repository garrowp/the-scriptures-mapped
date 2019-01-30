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

    /*---------------------------------------------------------------
    *                       PRIVATE VARIABLES
    */
    let books;
    let volumes;

    /*---------------------------------------------------------------
    *                       PRIVATE METHOD DECLARATIONS
    */
   let ajax;
   let bookChapterValid;
   let cacheBooks;
   let init;
   let navigateBook;
   let navigateChapter;
   let navigateHome;
   let onHashChanged;

    /*---------------------------------------------------------------
    *                       PRIVATE METHODS
    */

    ajax = function (url, successCallback, failureCallback) {
        let request = new XMLHttpRequest();

        request.open("GET", url, true);

        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                let data = JSON.parse(request.responseText);

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
        document.getElementById('scriptures').innerHTML = `<div>${bookId}</div>`;

        /*
         * NEEDSWORK: generate HTML that looks like this (to use Liddle's style.css):
         *
         *  <div id="scripnav">
         *      <div class="volumen"><h5>book.fullName</h5></div>
         *      <a class='btn chapter' id='1' href='#0:bookid:1'>1</a>
         *      <a class='btn chapter' id='2' href='#0:bookid:2'>2</a>
         *      ...
         *      <a class='btn chapter' id='49' href='#0:bookid:49'>49</a>
         *      <a class='btn chapter' id='50' href='#0:bookid:50'>50</a>
         * 
         * (plug in the right strings for book.fullName and bookId in the example above)
         * 
         * Logic for this method:
         * 1. Get the book for the given bookId
         * 2. If the book has no numbered chapters, call navigateChapter() for that bookId and chapter 0
         * 3. Else if the book has exactly one chapter, call navigateChapter() for that book ID and chapter 1
         * 4. Else generate HTML to match the example above
        */
        console.log("book");
    }

    navigateChapter = function(bookId, chapter) {
        if (bookId !== undefined) {
            let book = books[bookId];
            let volume = volumes[book.parentBookId - 1];

            // ajax()

            document.querySelector('#scriptures').innerHTML = `<div>Chapter ${chapter}</div>`;
        }
        console.log("book chapter");
    }

    navigateHome = function (volumeId) {
        let navContents = "<div id='scriptNav'>";
        volumes.forEach(volume => {
            if (volumeId === undefined || volumeId === volume.id) {
                navContents += `<div class='volume'>
                                <a name='v${volume.id}' />
                                <h5>${volume.fullName}</h5>
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

    /*---------------------------------------------------------------
    *                       PUBLIC API
    */

    return {
        init,
        onHashChanged
    }

}());
