// =================================================================================
// CONFIGURAÇÕES GLOBAIS
// =================================================================================

// Dimensões do seu recibo em Pixels (CSS)
const RECIBO_WIDTH_PX = 900;
const RECIBO_HEIGHT_PX = 500;

// Constante de conversão
const PX_TO_MM = 25.4 / 96;

// Dimensões do PDF em Milímetros
const pdfWidthMM = RECIBO_WIDTH_PX * PX_TO_MM; 
const pdfHeightMM = RECIBO_HEIGHT_PX * PX_TO_MM; 

const { jsPDF } = window.jspdf;
const reciboContainer = document.querySelector('.recibo-container');

// Seleção de Botões
const exportarBotao = document.getElementById('exportarPDF');
const exportarLocalBotao = document.getElementById('exportarLocal'); // Novo botão

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// SUBSTITUA PELA SUA URL DE IMPLANTAÇÃO (WEB APP URL) DO GOOGLE APPS SCRIPT
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx-nisGXNAsbfNyh5m-QmouwrQcZtEIAO8YNLCfxCKJiBUfcen_5f0Wn6OK1oOY6k6c/exec'; 
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


// =================================================================================
// FUNÇÕES DE EXPORTAÇÃO E UPLOAD
// =================================================================================

/**
 * Cria um clone do recibo e substitui inputs por divs estáticas para a renderização limpa do PDF.
 * @returns {HTMLElement} O elemento clonado e modificado.
 */
function prepararParaExportacao() {
    // 1. Clona o container original
    const clone = reciboContainer.cloneNode(true);
    
    // 2. Adiciona o clone temporariamente ao body, fora da área de visualização
    clone.style.position = 'absolute';
    clone.style.left = '-9999px'; 
    document.body.appendChild(clone);

    // 3. Processa e substitui todos os inputs (text, checkbox, etc.) do clone
    const inputs = clone.querySelectorAll('input');

    inputs.forEach(input => {
        let replacementElement;

        // a) Inputs de Texto (Linhas de valor/descrição, Data, Assinaturas)
        if (input.type === 'text' || input.type === 'date' || input.type === 'number') {
            replacementElement = document.createElement('div');
            replacementElement.textContent = input.value;
            replacementElement.className = input.className + ' static-content'; 

            if (input.classList.contains('date-input')) {
                replacementElement.classList.add('date-static');
            }
            
        // b) Inputs Checkbox
        } else if (input.type === 'checkbox') {
            replacementElement = document.createElement('span');
            
            // Usa um caractere unicode para simular o estado
            replacementElement.textContent = input.checked ? '☑' : '☐'; 
            
            replacementElement.className = input.className + ' static-checkbox'; 
            replacementElement.style.display = 'inline-block';
            replacementElement.style.marginRight = '10px';
            replacementElement.style.transform = 'scale(1.2)';

        } else {
             replacementElement = document.createElement('div');
             replacementElement.className = input.className;
        }
        
        // 4. Substitui o input no clone
        if (replacementElement) {
            input.parentNode.replaceChild(replacementElement, input);
        }
    });

    return clone;
}

/**
 * Envia o Base64 do PDF para o Google Apps Script para upload.
 * @param {string} base64Data - O PDF codificado em Base64.
 * @param {string} filename - Nome do arquivo a ser salvo no Drive.
 */
function uploadToGoogleDrive(base64Data, filename) {
    const dataToSend = new FormData();
    dataToSend.append('data', base64Data);
    dataToSend.append('filename', filename);

    exportarBotao.textContent = 'Enviando para o Drive... ⏳';

    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: dataToSend,
    })
    .then(response => response.text())
    .then(result => {
        console.log('Resultado do Upload:', result);
        if (result.includes('Sucesso')) {
            exportarBotao.textContent = '✅ Salvo no Drive!';
        } else {
            alert('❌ Erro no upload! Verifique o console ou o Apps Script: ' + result);
            exportarBotao.textContent = '❌ Erro no Upload.';
        }
    })
    .catch(error => {
        console.error('Erro de rede/upload:', error);
        alert('❌ Erro de conexão ou script.');
        exportarBotao.textContent = '❌ Erro de Conexão.';
    });
}

/**
 * Função principal para gerar o PDF.
 * É chamada tanto para o Drive (false) quanto para o Download local (true).
 * @param {boolean} triggerDownload - Se deve iniciar o download local.
 */
function gerarPDF(triggerDownload) {
    // 1. Prepara o elemento para renderização e define o nome do arquivo
    const reciboParaExportar = prepararParaExportacao();
    const dataAtual = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
    const nomeDoArquivo = `Recibo_${dataAtual}.pdf`;
    
    // 2. Desabilita os botões e atualiza o texto de feedback
    exportarBotao.disabled = true;
    exportarLocalBotao.disabled = true;
    if (triggerDownload) {
        exportarLocalBotao.textContent = 'Gerando PDF...';
    } else {
        exportarBotao.textContent = 'Gerando PDF...';
    }

    // 3. Usa o html2canvas para renderizar o elemento como uma imagem (canvas)
    html2canvas(reciboParaExportar, {
        scale: 2, 
        logging: false 
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png'); 
        
        // 4. CRIA O DOCUMENTO PDF
        const pdf = new jsPDF('l', 'mm', [pdfWidthMM, pdfHeightMM]);
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMM, pdfHeightMM);
        
        // 5. Executa a ação
        if (triggerDownload) {
            pdf.save(nomeDoArquivo); // Ação local
            exportarLocalBotao.textContent = '✅ Download Concluído';
        } else {
            const pdfBase64 = pdf.output('datauristring').split(',')[1];
            uploadToGoogleDrive(pdfBase64, nomeDoArquivo); // Ação de upload
        }

        // 6. LIMPEZA: Remove o clone do DOM após o processo
        document.body.removeChild(reciboParaExportar);
        
        // 7. Reabilita os botões após 3 segundos
        setTimeout(() => {
            exportarBotao.textContent = 'Exportar para PDF e Salvar no Drive';
            exportarLocalBotao.textContent = 'Salvar PDF Localmente';
            exportarBotao.disabled = false;
            exportarLocalBotao.disabled = false;
        }, 3000);
    });
}

// =================================================================================
// EVENT LISTENERS
// =================================================================================

// Botão para salvar localmente
exportarLocalBotao.addEventListener('click', () => {
    gerarPDF(true); // 'true' aciona o .save()
});

// Botão para salvar no Google Drive
exportarBotao.addEventListener('click', () => {
    gerarPDF(false); // 'false' aciona o uploadToGoogleDrive()
});


// =================================================================================
// FUNÇÕES DE FORMATAÇÃO E CÁLCULO
// =================================================================================

/**
 * Adiciona a máscara de data (DD/MM/AAAA) a um campo de input.
 * É chamada no onkeyup do input de data.
 * @param {HTMLInputElement} input - O elemento input a ser formatado.
 */
function formatarData(input) {
    let valor = input.value;
    valor = valor.replace(/\D/g, ''); // Remove não-dígitos
    valor = valor.substring(0, 8); // Limita a 8 dígitos (DDMMAAAA)

    if (valor.length > 2) {
        valor = valor.replace(/^(\d{2})(\d)/, '$1/$2');
    }
    if (valor.length > 4) {
        valor = valor.replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
    }

    input.value = valor;
}

/**
 * Adiciona a máscara de moeda (R$ BRL) a um campo de input e retorna o valor numérico.
 * @param {HTMLInputElement} input - O elemento input a ser formatado.
 * @returns {number} O valor numérico em reais (ex: 12.50).
 */
function formatarMoeda(input) {
    let valor = input.value.replace(/\D/g, '');

    if (!valor) {
        input.value = "";
        return 0;
    }

    let valorEmNumero = parseInt(valor, 10) / 100;
    let formatoBRL = new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL', 
        minimumFractionDigits: 2 
    }).format(valorEmNumero);

    input.value = formatoBRL;
    return valorEmNumero;
}

/**
 * Soma todos os valores dos inputs de linha.
 * @returns {number} A soma total dos valores.
 */
function somarValores() {
    let total = 0;
    // Seleciona todos os inputs de valor (que têm a classe line-input)
    const inputs = document.querySelectorAll('.line-input'); 
    
    inputs.forEach(input => {
        // Limpa e converte o valor formatado para um número decimal
        let valor = input.value.replace(/[^0-9,]/g, '').replace(',', '.');
        total += parseFloat(valor) || 0;
    });
    return total;
}

/**
 * Formata o input atual e recalcula/atualiza o total geral.
 * É chamada no onkeyup dos inputs de valor.
 * @param {HTMLInputElement} input - O elemento input que foi alterado.
 */
function formatarESomar(input) {
    // 1. Formata o input que foi modificado
    formatarMoeda(input); 

    // 2. Recalcula o total
    const total = somarValores();
    const inputTotal = document.getElementById('valorTotal');
    
    // 3. Formata e exibe o total
    inputTotal.value = new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL', 
        minimumFractionDigits: 2 
    }).format(total);
}