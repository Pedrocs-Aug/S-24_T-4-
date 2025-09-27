// Dimensões do seu recibo em Pixels (CSS)
const RECIBO_WIDTH_PX = 900;
const RECIBO_HEIGHT_PX = 500;

// Constante de conversão de Pixel (96 DPI) para Milímetro (mm)
const PX_TO_MM = 25.4 / 96;

// 1. Converte as dimensões do recibo para Milímetros (mm)
const pdfWidthMM = RECIBO_WIDTH_PX * PX_TO_MM; // Largura do PDF em mm
const pdfHeightMM = RECIBO_HEIGHT_PX * PX_TO_MM; // Altura do PDF em mm

// Certifique-se de que a biblioteca jspdf foi carregada corretamente
const { jsPDF } = window.jspdf;

// 1. Seleciona o elemento que queremos transformar em PDF
const reciboContainer = document.querySelector('.recibo-container');

// 2. Seleciona o botão de exportar
const exportarBotao = document.getElementById('exportarPDF');

/**
 * Função para criar um clone do recibo e substituir inputs por divs.
 * @returns {HTMLElement} O elemento clonado e modificado.
 */
function prepararParaExportacao() {
    // 1. Clona o container original (false para clone superficial, não é o ideal para o caso)
    // Usamos true para clonar todos os filhos (deep clone)
    const clone = reciboContainer.cloneNode(true);
    
    // 2. Adiciona o clone temporariamente ao body, fora da área de visualização,
    // para que o html2canvas possa renderizá-lo corretamente.
    clone.style.position = 'absolute';
    clone.style.left = '-9999px'; // Move para fora da tela
    document.body.appendChild(clone);

    // 3. Processa e substitui todos os inputs (text, checkbox, etc.) do clone
    const inputs = clone.querySelectorAll('input');

    inputs.forEach(input => {
        let replacementElement;

        // a) Inputs de Texto (Linhas de valor/descrição)
        if (input.type === 'text' || input.type === 'date') {
            replacementElement = document.createElement('div');
            
            // Copia o valor atual do input
            replacementElement.textContent = input.value;
            
            // Copia as classes CSS para manter a aparência (linha, fonte, tamanho)
            replacementElement.className = input.className + ' static-content'; 

            // Se for um input de data, ajusta a classe para a nova div
            if (input.classList.contains('date-input')) {
                replacementElement.classList.add('date-static');
            }
            
        // b) Inputs Checkbox
        } else if (input.type === 'checkbox') {
            replacementElement = document.createElement('span');
            
            // Usa um caractere unicode para simular o estado
            if (input.checked) {
                replacementElement.textContent = '☑'; // Caixa marcada
            } else {
                replacementElement.textContent = '☐'; // Caixa vazia
            }
            
            // Copia as classes do input para, no mínimo, posicionar o novo span
            replacementElement.className = input.className + ' static-checkbox'; 
            
            // Garante que o span seja estilizado para aparecer no lugar correto
            replacementElement.style.display = 'inline-block';
            replacementElement.style.marginRight = '10px';
            replacementElement.style.transform = 'scale(1.2)';

        } else {
            // Se houver outros tipos de input, eles serão ignorados ou tratados como div vazia
            replacementElement = document.createElement('div');
            replacementElement.className = input.className; // Mantém a classe original para estilos
        }
        
        // 4. Substitui o input original no clone pelo novo elemento estático
        if (replacementElement) {
            input.parentNode.replaceChild(replacementElement, input);
        }
    });

    return clone;
}

// 3. Adiciona o ouvinte de evento ao botão
exportarBotao.addEventListener('click', () => {
    // Prepara o elemento para renderização
    const reciboParaExportar = prepararParaExportacao();

    // 4. Usa o html2canvas para renderizar o elemento como uma imagem (canvas)
    html2canvas(reciboParaExportar, {
        scale: 2, // Mantemos a escala 2 para melhor qualidade da imagem (PNG)
        logging: false // Desabilita logs do html2canvas
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png'); 
        
        // 5. CRIA O DOCUMENTO PDF COM AS DIMENSÕES CUSTOMIZADAS EM MILÍMETROS
        const pdf = new jsPDF('l', 'mm', [pdfWidthMM, pdfHeightMM]);
        
        // Adiciona a imagem ao PDF (encaixe perfeito)
        const imageX = 0;
        const imageY = 0;
        pdf.addImage(imgData, 'PNG', imageX, imageY, pdfWidthMM, pdfHeightMM);
        
        // 6. Salva (abre) o PDF.
        pdf.save("Recibo.pdf");

        // 7. LIMPEZA: Remove o clone do DOM após a exportação
        document.body.removeChild(reciboParaExportar);
    });
});

/**
 * Adiciona a máscara de moeda (R$ BRL) a um campo de input.
 * @param {HTMLInputElement} input - O elemento input a ser formatado.
 */
function formatarMoeda(input) {
    let valor = input.value;

    // 1. Remove tudo que não for dígito, vírgula ou ponto.
    // Isso garante que você está trabalhando apenas com números.
    valor = valor.replace(/\D/g, '');

    // 2. Se o valor estiver vazio após a limpeza, saia.
    if (!valor) {
        input.value = "";
        return;
    }

    // 3. Converte para centavos e depois formata para BRL.
    // Ex: 22500 -> 225.00
    // O valor é dividido por 100 para obter a parte inteira e decimal.
    let valorEmNumero = parseInt(valor, 10) / 100;

    // 4. Formata o número como moeda brasileira (BRL).
    // O 'minimumFractionDigits: 2' garante os dois zeros após a vírgula.
    let formatoBRL = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(valorEmNumero);

    // 5. Atualiza o valor do input.
    input.value = formatoBRL;
}

/**
 * Adiciona a máscara de data (DD/MM/AAAA) a um campo de input.
 * @param {HTMLInputElement} input - O elemento input a ser formatado.
 */
function formatarData(input) {
    let valor = input.value;

    // 1. Remove qualquer caractere que não seja dígito
    valor = valor.replace(/\D/g, '');

    // 2. Limita o valor a 8 dígitos (DDMMAAAA)
    valor = valor.substring(0, 8);

    // 3. Aplica a formatação DD/MM/AAAA
    // Coloca a primeira barra após o segundo dígito (DD/)
    if (valor.length > 2) {
        valor = valor.replace(/^(\d{2})(\d)/, '$1/$2');
    }

    // Coloca a segunda barra após o quinto dígito (DD/MM/)
    if (valor.length > 4) {
        valor = valor.replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
    }

    // 4. Atualiza o valor do input com a máscara
    input.value = valor;
}