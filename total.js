/**
 * Remove a máscara de moeda de um valor e retorna o número.
 * @param {string} valorMascarado - O valor como "R$ 1.234,56".
 * @returns {number} O valor numérico (ex: 1234.56).
 */
function parseCurrency(valorMascarado) {
    if (!valorMascarado) return 0;
    // Remove "R$", pontos e substitui vírgula por ponto para conversão
    return parseFloat(valorMascarado.replace('R$', '').replace(/\./g, '').replace(',', '.'));
}

/**
 * Calcula o total de todos os inputs de valor e atualiza o campo Total.
 */
function calcularTotal() {
    // 1. Seleciona todos os inputs que queremos somar (usando a CLASSE)
    const camposDeValor = document.querySelectorAll('.line-input, .line-total-input');
    
    // 2. Encontra o input onde o resultado será exibido
    const inputTotal = document.getElementById('valorTotal');
    
    let soma = 0;
    
    camposDeValor.forEach(input => {
        // Ignora o próprio campo de total para evitar loops de soma
        if (input.id !== 'valorTotal') {
            soma += parseCurrency(input.value);
        }
    });

    // 3. Formata a soma de volta para BRL
    const formatoBRL = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(soma);
    
    // 4. Atualiza o valor do campo de total
    if (inputTotal) {
        inputTotal.value = formatoBRL;
    }
}

// 5. ATUALIZE O EVENTO onkeyup:
// Em vez de formatarMoeda(this), chame uma função que formata E soma:

function formatarESomar(input) {
    formatarMoeda(input); // Sua função de formatação já existente
    calcularTotal();      // Calcula o total após a formatação
}