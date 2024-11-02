import React, { useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Alert,
  CircularProgress,
  ThemeProvider,
  createTheme,
  Snackbar,
} from '@mui/material';
import {
  DescriptionOutlined,
  SaveAlt,
  Edit
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Definição do tema
const theme = createTheme({
  palette: {
    primary: {
      main: '#137662',
      dark: '#0d5449',
      light: '#1a8f77',
    },
    secondary: {
      main: '#4caf50',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Arial", sans-serif',
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

// Componente para campo com máscara de CPF
const CPFInput = ({ value, onChange, ...props }) => (
  <TextField
    {...props}
    value={value}
    onChange={onChange}
    inputProps={{
      maxLength: 14,
      placeholder: '000.000.000-00'
    }}
  />
);

// Componente para campo com máscara de telefone
const PhoneInput = ({ value, onChange, ...props }) => (
  <TextField
    {...props}
    value={value}
    onChange={onChange}
    inputProps={{
      maxLength: 15,
      placeholder: '(00) 00000-0000'
    }}
  />
);

const generatePDF = async (petitionText, formData) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Configurações de página
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = {
      top: 30,
      right: 25,
      bottom: 30,
      left: 25
    };
    const contentWidth = pageWidth - margin.left - margin.right;
    let yPosition = margin.top;

    // Função para adicionar nova página
    const addNewPage = () => {
      doc.addPage();
      yPosition = margin.top;
    };

    // Função para verificar necessidade de nova página
    const checkNewPage = (height) => {
      if (yPosition + height >= pageHeight - margin.bottom) {
        addNewPage();
        return true;
      }
      return false;
    };

    // Função para adicionar texto com espaçamento adequado
    const addText = (text, font = "normal", size = 12, align = 'left', spacing = 7) => {
      doc.setFont("times", font);
      doc.setFontSize(size);
      
      const lines = doc.splitTextToSize(text, contentWidth);
      
      lines.forEach(line => {
        checkNewPage(spacing);
        
        if (align === 'center') {
          doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
        } else {
          doc.text(line, margin.left, yPosition);
        }
        
        yPosition += spacing;
      });
      
      yPosition += spacing; // Espaçamento extra após o bloco de texto
    };

    // Cabeçalho
    addText("AO JUIZADO DA INFÂNCIA E DA JUVENTUDE DA COMARCA DE GOIÂNIA -- GOIÁS", "bold", 12, 'center');

    // Dados da criança e responsável
    const childInfo = `${formData.childName.toUpperCase()}, nascida em ${format(formData.childBirthDate, 'dd.MM.yyyy')}, inscrita no CPF sob o n° ${formData.childCPF}`;
    const motherInfo = `representada por sua genitora, ${formData.motherName.toUpperCase()}, ${formData.motherQualification}`;
    
    addText(childInfo, "bold", 12);
    addText(motherInfo, "normal", 12);

    // Título da Ação
    addText("AÇÃO DE OBRIGAÇÃO DE FAZER C/ DANOS MORAIS E PEDIDO DE TUTELA PROVISÓRIA DE URGÊNCIA", "bold", 12, 'center');

    // Em face de
    const emFace = `em face do MUNICÍPIO DE GOIÂNIA, pessoa jurídica de direito público interno, inscrita no CNPJ sob o nº 01.612.092/0001-23, com sede na Avenida do Cerrado, nº 999, Park Lozandes, Goiânia-GO, CEP 74884-092, pelos fundamentos de fato e de direito a seguir expostos.`;
    addText(emFace, "normal", 12);

    // Remove tags HTML do texto principal
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = petitionText;
    const cleanText = tempDiv.textContent || tempDiv.innerText;

    // Divide o texto em seções
    const sections = cleanText.split(/(?=\d+\)\s+[A-Z])/);

    // Processa cada seção
    sections.forEach(section => {
      if (section.trim()) {
        const titleMatch = section.match(/^(\d+\)\s+[A-ZÇÃÉÍÓÚÂÊÎÔÛÀÈÌÒÙÄËÏÖÜ\s]+)/);
        
        if (titleMatch) {
          const title = titleMatch[1];
          const content = section.substring(title.length);
          
          // Adiciona título da seção
          addText(title, "bold", 12);
          
          // Adiciona conteúdo da seção
          addText(content.trim(), "normal", 12);
        } else {
          addText(section.trim(), "normal", 12);
        }
      }
    });

    // Adiciona data e assinatura
    yPosition = pageHeight - margin.bottom - 40;
    const finalDate = `Goiânia, ${format(new Date(), 'dd.MM.yyyy')}`;
    addText(finalDate, "normal", 12);
    addText("DEFENSORIA PÚBLICA DO ESTADO DE GOIÁS", "bold", 12);

    doc.save('peticao.pdf');
    return true;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return false;
  }
};

function PetitionForm() {
  const [loading, setLoading] = useState(false);
  const [editorData, setEditorData] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [requestDate, setRequestDate] = useState(new Date());
  const [childBirthDate, setChildBirthDate] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Função para formatar CPF
  const formatCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Função para formatar telefone
  const formatPhone = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const data = {
      prompt: formData.get('situation'),
      child_name: formData.get('childName'),
      child_birth_date: childBirthDate ? format(childBirthDate, 'dd.MM.yyyy') : '',
      child_cpf: formData.get('childCPF'),
      mother_name: formData.get('motherName'),
      mother_qualification: formData.get('motherQualification'),
      mother_address: formData.get('motherAddress'),
      mother_phone: formData.get('motherPhone'),
      mother_email: formData.get('motherEmail'),
      cmei_name: formData.get('cmeiName'),
      request_date: requestDate ? format(requestDate, 'dd.MM.yyyy') : ''
    };

    try {
      const response = await fetch('http://localhost:8000/generate-petition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Erro ao gerar petição');
      
      const resultData = await response.json();
      setEditorData(resultData.petition);
      setIsEditing(false);
      setSnackbar({
        open: true,
        message: 'Petição gerada com sucesso!',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || 'Erro ao gerar petição',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!editorData) return;
    
    const formData = {
      childName: document.querySelector('[name="childName"]').value,
      childBirthDate: childBirthDate,
      childCPF: document.querySelector('[name="childCPF"]').value,
      motherName: document.querySelector('[name="motherName"]').value,
      motherQualification: document.querySelector('[name="motherQualification"]').value,
    };
    
    const success = await generatePDF(editorData, formData);
    
    setSnackbar({
      open: true,
      message: success ? 'Documento baixado com sucesso!' : 'Erro ao baixar documento',
      severity: success ? 'success' : 'error'
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" component="h1" color="primary" gutterBottom>
                Gerador de Petições
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Sistema de geração automatizada de petições para CMEI
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Dados da Criança */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Dados da Criança
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    name="childName"
                    label="Nome da Criança"
                    required
                    placeholder="Nome completo da criança"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                    <DatePicker
                      label="Data de Nascimento"
                      value={childBirthDate}
                      onChange={(newValue) => setChildBirthDate(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          required
                          variant="outlined"
                        />
                      )}
                      inputFormat="dd/MM/yyyy"
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12} md={6}>
                  <CPFInput
                    name="childCPF"
                    label="CPF da Criança"
                    required
                    onChange={(e) => {
                      e.target.value = formatCPF(e.target.value);
                    }}
                  />
                </Grid>

                {/* Dados da Mãe */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Dados da Mãe
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    name="motherName"
                    label="Nome da Mãe"
                    required
                    placeholder="Nome completo da mãe"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    name="motherQualification"
                    label="Qualificação da Mãe"
                    required
                    placeholder="Ex: brasileira, solteira, vendedora, RG 0000000 SSP/GO, CPF 000.000.000-00"
                    multiline
                    rows={2}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    name="motherAddress"
                    label="Endereço Completo"
                    required
                    placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <PhoneInput
                    name="motherPhone"
                    label="Telefone"
                    required
                    onChange={(e) => {
                      e.target.value = formatPhone(e.target.value);
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    name="motherEmail"
                    label="E-mail"
                    required
                    type="email"
                    placeholder="exemplo@email.com"
                  />
                </Grid>

                {/* Dados do CMEI e Situação */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Dados do CMEI e Situação
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    name="cmeiName"
                    label="Nome do CMEI"
                    required
                    placeholder="Ex: CMEI Central"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                    <DatePicker
                      label="Data da Solicitação"
                      value={requestDate}
                      onChange={(newValue) => setRequestDate(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          required
                          variant="outlined"
                        />
                      )}
                      inputFormat="dd/MM/yyyy"
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    name="situation"
                    label="Narrativa da Situação"
                    required
                    multiline
                    rows={4}
                    placeholder="Descreva detalhadamente a situação..."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <DescriptionOutlined />}
                      fullWidth
                    >
                      {loading ? 'Gerando...' : 'Gerar Petição'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>

            {editorData && (
              <Box sx={{ mt: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" color="primary">
                    Petição Gerada:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => setIsEditing(!isEditing)}
                      startIcon={<Edit />}
                    >
                      {isEditing ? 'Visualizar' : 'Editar'}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleDownload}
                      startIcon={<SaveAlt />}
                    >Baixar PDF
                    </Button>
                  </Box>
                </Box>
                
                {isEditing ? (
                  <CKEditor
                    editor={ClassicEditor}
                    data={editorData}
                    onChange={(event, editor) => {
                      const data = editor.getData();
                      setEditorData(data);
                    }}
                    config={{
                      language: 'pt-br',
                      toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|', 'indent', 'outdent', '|', 'blockQuote', 'undo', 'redo']
                    }}
                  />
                ) : (
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      backgroundColor: '#f5f5f5', 
                      '& > div': { whiteSpace: 'pre-wrap' } 
                    }}
                    dangerouslySetInnerHTML={{ __html: editorData }}
                  />
                )}
              </Box>
            )}

            <Snackbar
              open={snackbar.open}
              autoHideDuration={6000}
              onClose={handleCloseSnackbar}
            >
              <Alert
                onClose={handleCloseSnackbar}
                severity={snackbar.severity}
                sx={{ width: '100%' }}
              >
                {snackbar.message}
              </Alert>
            </Snackbar>
          </Paper>
        </Container>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default PetitionForm;