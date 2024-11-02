export const editorConfig = {
    language: 'pt-br',
    toolbar: [
      'heading',
      '|',
      'bold',
      'italic',
      'underline',
      '|',
      'bulletedList',
      'numberedList',
      '|',
      'indent',
      'outdent',
      '|',
      'alignment',
      'blockQuote',
      '|',
      'undo',
      'redo'
    ],
    heading: {
      options: [
        { model: 'paragraph', title: 'Parágrafo', class: 'ck-heading_paragraph' },
        { model: 'heading1', view: 'h1', title: 'Título 1', class: 'ck-heading_heading1' },
        { model: 'heading2', view: 'h2', title: 'Título 2', class: 'ck-heading_heading2' }
      ]
    },
    fontSize: {
      options: [12, 13, 14, 16, 18]
    },
    alignment: {
      options: ['left', 'center', 'right', 'justify']
    }
  };
  
  export const processTextForEditor = (text) => {
    if (!text) return '';
    
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(.*?)\]/g, '$1')
      .replace(/\{\.mark\}/g, '')
      .replace(/\{\.underline\}/g, '')
      .split('\n\n').map(paragraph => `<p>${paragraph}</p>`).join('\n')
      .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');
  };