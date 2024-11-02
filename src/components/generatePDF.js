import html2pdf from 'html2pdf.js';

export const generatePDF = async (editorData) => {
  try {
    const element = document.createElement('div');
    element.innerHTML = editorData;
    
    const pdfOptions = {
      margin: [30, 40, 30, 40], // top, right, bottom, left
      filename: 'peticao.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    await html2pdf().from(element).set(pdfOptions).save();
    return true;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return false;
  }
};