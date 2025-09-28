// Dimensões do seu recibo em Pixels (CSS)
const RECIBO_WIDTH_PX = 900;
const RECIBO_HEIGHT_PX = 500;
const PX_TO_MM = 25.4 / 96;
const pdfWidthMM = RECIBO_WIDTH_PX * PX_TO_MM; 
const pdfHeightMM = RECIBO_HEIGHT_PX * PX_TO_MM; 

const { jsPDF } = window.jspdf;
const reciboContainer = document.querySelector('.recibo-container');
const exportarBotao = document.getElementById('exportarPDF');

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// SUBSTITUA PELA SUA URL DE IMPLANTAÇÃO (WEB APP URL) DO GOOGLE APPS SCRIPT
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx-nisGXNAsbfNyh5m-QmouwrQcZtEIAO8YNLCfxCKJiBUfcen_5f0Wn6OK1oOY6k6c/exec'; 
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


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
    exportarBotao.disabled = true;

    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: dataToSend,
        // O Fetch API lida automaticamente com o 'multipart/form-data'
    })
    .then(response => response.text())
    .then(result => {
        console.log('Resultado do Upload:', result);
        if (result.includes('Sucesso')) {
            alert('✅ PDF criado e enviado com sucesso para o Google Drive!');
            exportarBotao.textContent = '✅ Sucesso! PDF Enviado.';
        } else {
            alert('❌ Erro no upload! Verifique o console ou o Apps Script: ' + result);
            exportarBotao.textContent = '❌ Erro no Upload.';
        }
    })
    .catch(error => {
        console.error('Erro de rede/upload:', error);
        alert('❌ Erro de conexão ou script.');
        exportarBotao.textContent = '❌ Erro no Upload.';
    })
    .finally(() => {
        setTimeout(() => {
            exportarBotao.textContent = 'Exportar para PDF e Salvar no Drive';
            exportarBotao.disabled = false;
        }, 3000);
    });
}

function prepararParaExportacao() {
    // ... (A função prepararParaExportacao permanece a mesma, pois ela cria o clone para o html2canvas) ...
    const clone = reciboContainer.cloneNode(true);
    
    // Adiciona o clone temporariamente ao body, fora da área de visualização.
    clone.style.position = 'absolute';
    clone.style.left = '-9999px'; 
    document.body.appendChild(clone);

    // Processa e substitui todos os inputs (text, checkbox, etc.) do clone
    const inputs = clone.querySelectorAll('input');

    inputs.forEach(input => {
        let replacementElement;

        if (input.type === 'text' || input.type === 'date') {
            replacementElement = document.createElement('div');
            replacementElement.textContent = input.value;
            replacementElement.className = input.className + ' static-content'; 

            if (input.classList.contains('date-input')) {
                replacementElement.classList.add('date-static');
            }
        } else if (input.type === 'checkbox') {
            replacementElement = document.createElement('span');
            
            if (input.checked) {
                replacementElement.textContent = '☑'; // Caixa marcada
            } else {
                replacementElement.textContent = '☐'; // Caixa vazia
            }
            
            replacementElement.className = input.className + ' static-checkbox'; 
            replacementElement.style.display = 'inline-block';
            replacementElement.style.marginRight = '10px';
            replacementElement.style.transform = 'scale(1.2)';

        } else {
             // Tratamento para outros inputs (como radio se existissem)
             replacementElement = document.createElement('div');
             replacementElement.className = input.className;
        }
        
        if (replacementElement) {
            input.parentNode.replaceChild(replacementElement, input);
        }
    });

    return clone;
}

// 3. Adiciona o ouvinte de evento ao botão
exportarBotao.addEventListener('click', () => {
    // 1. Prepara o elemento para renderização
    const reciboParaExportar = prepararParaExportacao();
    const dataAtual = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
    const nomeDoArquivo = `Recibo_${dataAtual}.pdf`;

    // 2. Usa o html2canvas para renderizar o elemento como uma imagem (canvas)
    html2canvas(reciboParaExportar, {
        scale: 2, 
        logging: false 
    }).then(canvas => {
        // 3. Obtém o Data URL (PNG)
        const imgData = canvas.toDataURL('image/png'); 
        
        // 4. CRIA O DOCUMENTO PDF
        const pdf = new jsPDF('l', 'mm', [pdfWidthMM, pdfHeightMM]);
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMM, pdfHeightMM);
        
        // 5. Converte o PDF para Base64
        // A função output retorna uma string Base64 do arquivo PDF
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        
        // 6. Envia o Base64 para o Apps Script
        uploadToGoogleDrive(pdfBase64, nomeDoArquivo);

        // 7. LIMPEZA: Remove o clone do DOM após o processo
        document.body.removeChild(reciboParaExportar);
    });
});

// Funções de formatação de data e total (mantidas)
function formatarData(input) {
    let valor = input.value;
    valor = valor.replace(/\D/g, '');
    valor = valor.substring(0, 8);
    if (valor.length > 2) {
        valor = valor.replace(/^(\d{2})(\d)/, '$1/$2');
    }
    if (valor.length > 4) {
        valor = valor.replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
    }
    input.value = valor;
}

// O conteúdo de total.js deve ser importado para o index.js ou mantido separadamente se for o caso
// Assumindo que você tem uma função para formatar e somar:
function formatarMoeda(input) {
    let valor = input.value.replace(/\D/g, '');
    if (!valor) {
        input.value = "";
        return 0; // Retorna 0 para a soma
    }
    let valorEmNumero = parseInt(valor, 10) / 100;
    let formatoBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(valorEmNumero);
    input.value = formatoBRL;
    return valorEmNumero;
}

function somarValores() {
    let total = 0;
    const inputs = document.querySelectorAll('.line-input');
    inputs.forEach(input => {
        let valor = input.value.replace(/[^0-9,]/g, '').replace(',', '.');
        total += parseFloat(valor) || 0;
    });
    return total;
}

function formatarESomar(input) {
    formatarMoeda(input);
    const total = somarValores();
    const inputTotal = document.getElementById('valorTotal');
    inputTotal.value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(total);
}