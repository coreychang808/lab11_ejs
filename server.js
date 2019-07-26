'use strict';

const express = require('express');
const pg =require('pg');
const superagent = require('superagent');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('err', err => console.log(err));

app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static('public'));

app.set('view engine', 'ejs');



// API Routes

app.get('/', getBookShelf);

// Creates a new search to the Google Books API
app.post('/searches', createSearch);

app.get('/searches/new', newSearch); 

app.post('/books', createBook);

app.get('/books/:id', getBook);

// Catch-all
app.get('*', (request, response) => response.status(404).send('This route does not exist'));

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

// HELPER FUNCTIONS
function Book(info) {
  this.title = info.title? info.title : 'No title available';
  this.authors = info.authors? info.authors : 'No authors available';
  this.isbn = info.industryIdentifiers[0].indentifier;
  this.decription = info.description? info.description: 'No description available';
  this.image = info.imageLinks.thumbnail.replace(/^http:\/\//i, 'https://') || "https://www.fillmurray.com/640/360";
  this.id = info.industryIdentifiers ? `${info.industryIdentifiers[0].indentifier}` : '';
}


function getBookShelf (request, response) {
  let SQL = `SELECT * FROM books`;
  return client.query(SQL)
  .then(results => {
    if (results.rows.rowCount === 0){
      response.render('pages/searches/new');
    }else {
      response.render('pages/index', {books:results.rows})
    }
  })
  .catch(err=> handleError(err, reponse));
}

// Note that .ejs file extension is not required
function newSearch(request, response) {
  // response.send('hello');
  response.render('pages/searches/new');
}

// No API key required
// Console.log request.body and request.body.search
function createSearch(request, response) {
  let url = 'https://www.googleapis.com/books/v1/volumes?q=';

  
  if (request.body.search[1] === 'title') { url += `+intitle:${request.body.search[0]}`; }
  if (request.body.search[1] === 'author') { url += `+inauthor:${request.body.search[0]}`; }
  
  superagent.get(url)
  .then(apiResponse => apiResponse.body.items.map(bookResult => new Book(bookResult.volumeInfo)))
  .then(results => response.render('pages/searches/show', { results: results }))
  .catch(err => handleError(err, reponse));
}

function createBook(request, response) {
  let normalizedShelf = request.body.bookshelf.toLowerCase();

  let { title, author, isbn, image_url, description } = request.body;
  let SQL = 'INSERT INTO books(title, author, isbn, image_url, description, bookshelf) VALUES($1, $2, $3, $4, $5, $6);';
  let values = [title, author, isbn, image_url, description, normalizedShelf];

  return client.query(SQL, values)
    .then(() => {
      SQL = 'SELECT * FROM books WHERE isbn=$1;';
      values = [request.body.isbn];
      return client.query(SQL, values)
        .then(result => response.redirect(`/books/${result.rows[0].id}`))
        .catch(handleError);
    })
    .catch(err => handleError(err, response));
}

function getBook(request, response) {
  getBookshelves()
    .then(shelves => {
      let SQL = 'SELECT * FROM books WHERE id=$1;';
      let values = [request.params.id];
      client.query(SQL, values)
        .then(result => response.render('pages/books/show', { book: result.rows[0], bookshelves: shelves.rows }))
        .catch(err => handleError(err, response));
    })
}

function getBookshelves() {
  let SQL = 'SELECT DISTINCT bookshelf FROM books_app ORDER BY bookshelf;';

  return client.query(SQL);
}












// how will we handle errors?

function handleError (error, response) {
  response.render('pages/error',  {error: error});
}
