document.addEventListener('DOMContentLoaded', () => {
    const cardContainer = document.querySelector('.card-container');
    const inputBusca = document.getElementById('input-busca');
    const botaoBusca = document.getElementById('botao-busca');
    const generoFiltrosContainer = document.getElementById('genero-filtros');
    const toggleFiltrosBtn = document.getElementById('toggle-filtros-btn');

    let todosOsFilmes = []; // Armazena todos os filmes carregados da API

    // --- Lógica para carregar os filmes ---
    async function carregarFilmes() {
        try {
            // Busca os filmes da API do backend, que combina os filmes locais e os da API externa.
            const response = await fetch('http://localhost:3000/api/movies'); 
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            todosOsFilmes = await response.json();
            popularFiltrosDeGenero();
            renderizarFilmes(todosOsFilmes);
        } catch (error) {
            console.error("Não foi possível carregar os filmes:", error);
            cardContainer.innerHTML = "<p>Erro ao carregar filmes. Tente novamente mais tarde.</p>";
        }
    }

    function renderizarFilmes(filmesParaRenderizar) {
        cardContainer.innerHTML = ''; // Limpa o container

        if (filmesParaRenderizar.length === 0) {
            cardContainer.innerHTML = "<p>Nenhum filme encontrado com os critérios selecionados.</p>";
            return;
        }

        filmesParaRenderizar.forEach(filme => {
            const card = document.createElement('article');
            card.innerHTML = `
                <img src="${filme.imagem}" alt="Pôster do filme ${filme.nome}" class="card-image">
                <div class="card-content">
                    <h2>${filme.nome}</h2>
                <p><strong>Diretor:</strong> ${filme.diretor}</p>
                <p><strong>Ano:</strong> ${filme.ano}</p>
                <p><strong>Gênero:</strong> ${filme.genero.join(', ')}</p>
                <p>${filme.sinopse}</p>
                <div class="card-footer">
                    <a href="${filme.link}" target="_blank">Ver mais</a>
                </div>
                </div>
                <div class="comments-section">
                    <h3>Comentários</h3>
                    <div class="comments-list">
                        <p class="no-comments">Carregando comentários...</p>
                    </div>
                    <form class="comment-form" data-film-id="${filme.id}">
                        <input type="text" name="author" placeholder="Seu nome" required>
                        <textarea name="text" placeholder="Escreva seu comentário..." required></textarea>
                        <button type="submit">Postar</button>
                    </form>
                </div>
            `;
            cardContainer.appendChild(card);

            // Carrega os comentários para este filme específico
            carregarComentarios(filme.id, card.querySelector('.comments-list'));

            // Adiciona o listener para o formulário de comentário
            const commentForm = card.querySelector('.comment-form');
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                postarComentario(filme.id, commentForm);
            });
        });
    }

    async function carregarComentarios(filmId, commentsListElement) {
        try {
            const response = await fetch(`http://localhost:3000/api/comments/${filmId}`);
            const comments = await response.json();

            commentsListElement.innerHTML = ''; // Limpa a lista
            if (comments.length === 0) {
                commentsListElement.innerHTML = '<p class="no-comments">Nenhum comentário ainda. Seja o primeiro!</p>';
            } else {
                comments.forEach(comment => {
                    const commentDiv = document.createElement('div');
                    commentDiv.className = 'comment';
                    commentDiv.innerHTML = `<p><strong>${comment.author}:</strong> ${comment.text}</p>`;
                    commentsListElement.appendChild(commentDiv);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar comentários:', error);
            commentsListElement.innerHTML = '<p class="no-comments">Não foi possível carregar os comentários.</p>';
        }
    }

    async function postarComentario(filmId, formElement) {
        const author = formElement.querySelector('input[name="author"]').value;
        const text = formElement.querySelector('textarea[name="text"]').value;

        try {
            // Envia o novo comentário para a API do backend para ser salvo no banco de dados.
            await fetch('http://localhost:3000/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filmId, author, text })
            });

            formElement.reset(); // Limpa o formulário
            // Recarrega a lista de comentários para mostrar o novo comentário salvo.
            carregarComentarios(filmId, formElement.previousElementSibling);
        } catch (error) {
            console.error('Erro ao postar comentário:', error);
        }
    }

    function popularFiltrosDeGenero() {
        const todosOsGeneros = new Set();
        todosOsFilmes.forEach(filme => {
            filme.genero.forEach(g => todosOsGeneros.add(g));
        });

        const generosOrdenados = Array.from(todosOsGeneros).sort();

        generosOrdenados.forEach(genero => {
            const div = document.createElement('div');
            div.className = 'filtro-checkbox';
            div.innerHTML = `
                <input type="checkbox" id="filtro-${genero}" name="genero" value="${genero}">
                <label for="filtro-${genero}">${genero}</label>
            `;
            generoFiltrosContainer.appendChild(div);
        });

        // Adiciona o listener de evento a todos os checkboxes de gênero
        document.querySelectorAll('input[name="genero"]').forEach(checkbox => {
            checkbox.addEventListener('change', aplicarFiltros);
        });
    }

    function aplicarFiltros() {
        const termoBusca = inputBusca.value.toLowerCase();
        const generosSelecionados = Array.from(document.querySelectorAll('input[name="genero"]:checked')).map(cb => cb.value);

        let filmesFiltrados = todosOsFilmes.filter(filme => {
            // Filtro por texto de busca (nome, diretor)
            const buscaValida = termoBusca === '' ||
                filme.nome.toLowerCase().includes(termoBusca) ||
                filme.diretor.toLowerCase().includes(termoBusca);

            // Filtro por gênero
            const generoValido = generosSelecionados.length === 0 ||
                generosSelecionados.every(genero => filme.genero.includes(genero));

            return buscaValida && generoValido;
        });

        renderizarFilmes(filmesFiltrados);
    }

    // --- Event Listeners Otimizados ---
    botaoBusca.addEventListener('click', aplicarFiltros);
    // O evento 'input' é mais eficiente e reage a qualquer alteração no campo (digitar, colar, etc.)
    inputBusca.addEventListener('input', aplicarFiltros);

    toggleFiltrosBtn.addEventListener('click', () => {
        const isHidden = generoFiltrosContainer.style.maxHeight === '0px' || !generoFiltrosContainer.style.maxHeight;
        if (isHidden) {
            // Mostra os filtros
            generoFiltrosContainer.style.maxHeight = generoFiltrosContainer.scrollHeight + "px";
            toggleFiltrosBtn.textContent = 'Esconder Filtros';
        } else {
            // Esconde os filtros
            generoFiltrosContainer.style.maxHeight = '0px';
            toggleFiltrosBtn.textContent = 'Mostrar Filtros';
        }
    });

    // Carrega os filmes ao iniciar a página
    carregarFilmes();
});