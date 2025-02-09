const recommendationList = document.getElementById('recommendation-list');
const genreSelector = document.getElementById('genre-selector');
const reloadBtn = document.getElementById('reload-suggestions');
const searchBar = document.getElementById('search-bar');
const shelves = {
    toRead: document.querySelector('#to-read .book-list'),
    reading: document.querySelector('#reading .book-list'),
    completed: document.querySelector('#completed .book-list')
};

let library = JSON.parse(localStorage.getItem('library')) || {
    toRead: [],
    reading: [],
    completed: []
};

function updateShelf(shelfKey) {
    const shelf = shelves[shelfKey];
    shelf.innerHTML = library[shelfKey].map(book => `
        <div class="book-card">
            <img src="${book.cover}" alt="${book.title}" />
            <h4>${book.title}</h4>
            <p>${book.author}</p>
            <button onclick="moveBookToShelf('${book.id}', '${shelfKey === 'toRead' ? 'reading' : 'completed'}')">
                Move to ${shelfKey === 'toRead' ? 'Reading' : 'Completed'}
            </button>
        </div>
    `).join('');
}

async function fetchRecommendations() {
    const genre = genreSelector.value;
    let query = genre === 'random' ? 'bestseller' : `subject:${genre}`;
    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=10&langRestrict=en`);
        const data = await response.json();
        if (data.items) {
            displayRecommendations(data.items);
        }
    } catch (error) {
        console.error('Error fetching book recommendations:', error);
    }
}

function displayRecommendations(books) {
    recommendationList.innerHTML = books.map(book => {
        const volumeInfo = book.volumeInfo;
        const coverUrl = volumeInfo.imageLinks ? volumeInfo.imageLinks.thumbnail : 'https://via.placeholder.com/128x192';
        return `
            <div class="book-card">
                <img src="${coverUrl}" alt="${volumeInfo.title}" />
                <h4>${volumeInfo.title}</h4>
                <p>${volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author'}</p>
                <button onclick="addBookToShelf('${book.id}', 'toRead')">Add to To Read</button>
            </div>
        `;
    }).join('');
}

async function addBookToShelf(bookId, shelfKey) {
    const bookData = await fetchBookData(bookId);
    if (!bookData) return;
    if (!library[shelfKey].some(book => book.id === bookData.id)) {
        library[shelfKey].push(bookData);
        updateShelf(shelfKey);
        saveLibrary();
    }
}

async function fetchBookData(bookId) {
    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}`);
        const data = await response.json();
        const book = data.volumeInfo;
        return {
            id: bookId,
            title: book.title,
            author: book.authors ? book.authors.join(', ') : 'Unknown Author',
            cover: book.imageLinks ? book.imageLinks.thumbnail : 'https://via.placeholder.com/128x192'
        };
    } catch (error) {
        console.error('Error fetching book data:', error);
        return null;
    }
}

function saveLibrary() {
    localStorage.setItem('library', JSON.stringify(library));
}

function moveBookToShelf(bookId, targetShelfKey) {
    for (const shelfKey in library) {
        const bookIndex = library[shelfKey].findIndex(book => book.id === bookId);
        if (bookIndex !== -1) {
            const [book] = library[shelfKey].splice(bookIndex, 1);
            library[targetShelfKey].push(book);
            updateShelf(shelfKey);
            updateShelf(targetShelfKey);
            saveLibrary();
            break;
        }
    }
}

function init() {
    genreSelector.addEventListener('change', fetchRecommendations);
    reloadBtn.addEventListener('click', fetchRecommendations);
    searchBar.addEventListener('input', debounce(handleSearch, 300));
    fetchRecommendations();
    updateShelf('toRead');
    updateShelf('reading');
    updateShelf('completed');
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

async function handleSearch(event) {
    const query = event.target.value.trim();
    if (query.length < 2) return;
    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5&langRestrict=en`);
        const data = await response.json();
        displayRecommendations(data.items);
    } catch (error) {
        console.error('Error searching books:', error);
    }
}

init();
