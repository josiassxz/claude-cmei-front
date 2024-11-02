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
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, convertInchesToTwip } from 'docx';

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

const generateDocument = async (petitionText) => {
  try {
    // Remove tags HTML do texto
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = petitionText;
    const cleanText = tempDiv.textContent || tempDiv.innerText;

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: cleanText,
                font: "Times New Roman",
                size: 24,
              }),
            ],
            spacing: {
              line: 360,
              before: 200,
              after: 200,
            },
            alignment: AlignmentType.JUSTIFIED,
          }),
        ],
      }],
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
    
    const success = await generateDocument(editorData);
    
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
                  <DatePicker
                    label="Data de Nascimento"
                    value={childBirthDate}
                    onChange={(newValue) => setChildBirthDate(newValue)}
                    slotProps={{
                      textField: {
                        required: true,
                        fullWidth: true
                      }
                    }}
                  />
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
                  <DatePicker
                    label="Data da Solicitação"
                    value={requestDate}
                    onChange={(newValue) => setRequestDate(newValue)}
                    slotProps={{
                      textField: {
                        required: true,
                        fullWidth: true
                      }
                    }}
                  />
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
                    >
                      Baixar DOCX
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