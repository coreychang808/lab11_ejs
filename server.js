'use strict';

const express = require('express');
const superagent = require('superagent');
const app = express();
const pg =require('pg');

require('dotenv').config();

const PORT = process.env.PORT || 3000;

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('err', err => console.log(err));

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.use('/public', express.static('public'));

//bookshelf 
app.get('/', getBookShelf);


// API Routes
// Renders the search form
//index(home)
app.get('/searchPage', newSearch); 

// Creates a new search to the Google Books API
app.post('/searches', createSearch);

// Catch-all
app.get('*', (request, response) => response.status(404).send('This route does not exist'));


// HELPER FUNCTIONS
function Book(info) {
  this.image = info.imageLinks.thumbnail.replace(/^http:\/\//i, 'https://') || "https://www.fillmurray.com/640/360";
  this.title = info.title;
  this.isbn = info.industryIdentifiers[0].indentifier;
  this.authors = info.authors;
  this.decription = info.description;
}

// instance method: saving to a db

// Book.prototype.save = function () {
  //   let SQL = `
  //     INSERT INTO books
  //       (image,title,authors,decription) 
  //       VALUES($1,$2,$3,$4) 
//       RETURNING id
//   `;
//   let values = Object.values(this);
//   return client.query(SQL, values);
// };

//bookshelf function

function getBookShelf (request, reponse) {
  let SQL = `SELECT * FROM books`;
  return client.query(sql)
  .then(results => response.render('../views/pages/index.ejs', { results: results.row }))
  .catch(err=>console.log('shit database is broke', err));
}

// Note that .ejs file extension is not required
function newSearch(request, response) {
  // response.send('hello');
  response.render('../views/pages/searches/new.ejs');
}

// No API key required
// Console.log request.body and request.body.search
function createSearch(request, response) {
  let url = 'https://www.googleapis.com/books/v1/volumes?q=';
  
  console.log(request.body);
  console.log(request.body.search);
  
  if (request.body.search[1] === 'title') { url += `+intitle:${request.body.search[0]}`; }
  if (request.body.search[1] === 'author') { url += `+inauthor:${request.body.search[0]}`; }
  
  superagent.get(url)
  .then(apiResponse => apiResponse.body.items.map(bookResult => new Book(bookResult.volumeInfo)))
  .then(results => response.render('pages/searches/show', { searchResults: results }));
}
// how will we handle errors?

// function handleError (error, response) {
//   response.render('pages/error',  {error: error});
// }

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));