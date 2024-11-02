import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';

const generateDocument = async (petitionText) => {
  try {
    // Processa o texto identificando diferentes tipos de formatação
    const processFormattedText = (text) => {
      if (text.startsWith('>')) {
        // Formatação especial para citações
        return {
          text: text.substring(1).trim(),
          isQuote: true,
          bold: text.includes('**'),
        };
      }

      // Processa texto em negrito (**texto**)
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return {
            text: part.slice(2, -2),
            bold: true
          };
        }
        return {
          text: part,
          bold: false
        };
      });
    };

    // Divide o texto em parágrafos e processa cada um
    const paragraphs = petitionText.split('\n\n').map(paragraph => {
      const formattedText = processFormattedText(paragraph.trim());

      if (Array.isArray(formattedText)) {
        // Parágrafo normal
        return new Paragraph({
          children: formattedText.map(part => 
            new TextRun({
              text: part.text,
              bold: part.bold,
              font: "Times New Roman",
              size: 24,
            })
          ),
          spacing: {
            line: 360, // 1.5 spacing
            before: 240,
            after: 240,
          },
          alignment: AlignmentType.JUSTIFIED
        });
      } else if (formattedText.isQuote) {
        // Citações
        return new Paragraph({
          children: [
            new TextRun({
              text: formattedText.text,
              bold: formattedText.bold,
              font: "Times New Roman",
              size: 24,
            })
          ],
          indent: {
            left: convertInchesToTwip(1.5),
            right: convertInchesToTwip(1),
          },
          spacing: {
            line: 360,
            before: 240,
            after: 240,
          },
          alignment: AlignmentType.JUSTIFIED
        });
      }
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1.5),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.5),
            },
            size: {
              width: convertInchesToTwip(8.5),
              height: convertInchesToTwip(11),
            },
          },
        },
        children: [
          // Cabeçalho centralizado
          new Paragraph({
            children: [
              new TextRun({
                text: "AO JUIZADO DA INFÂNCIA E DA JUVENTUDE DA COMARCA DE GOIÂNIA -- GOIÁS",
                bold: true,
                font: "Times New Roman",
                size: 24,
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 240,
              after: 240,
            },
          }),
          ...paragraphs
        ],
      }],
      defaultRunProperties: {
        size: 24,
        font: "Times New Roman",
      },
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'peticao.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Erro ao gerar documento:', error);
    return false;
  }
};