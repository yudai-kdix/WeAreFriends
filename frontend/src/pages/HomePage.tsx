import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Container, Typography, Button, Paper, Grid } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SettingsIcon from '@mui/icons-material/Settings';

const HomePage: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 4 }}>
          We Are Friends
        </Typography>
        
        <Typography variant="h6" sx={{ mb: 5 }}>
          カメラで物体を識別し、会話を楽しむAR体験アプリケーション
        </Typography>
        
        <Grid container spacing={4} justifyContent="center" sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6
                }
              }}
            >
              <CameraAltIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>カメラモード</Typography>
              <Typography sx={{ mb: 3 }}>
                カメラを使って物体を識別し、対話を楽しみましょう
              </Typography>
              <Button 
                href="/camera"
                variant="contained" 
                size="large" 
                fullWidth
                sx={{ mt: 2 }}
              >
                開始する
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6
                }
              }}
            >
              <SettingsIcon sx={{ fontSize: 60, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>識別対象管理</Typography>
              <Typography sx={{ mb: 3 }}>
                新しい識別対象を追加し、プロンプトを設定する
              </Typography>
              <Button 
                href="/manage"
                variant="outlined" 
                color="secondary" 
                size="large" 
                fullWidth
                sx={{ mt: 2 }}
              >
                管理画面へ
              </Button>
            </Paper>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            &copy; 2025 We Are Friends - カメラを通して新しい友達と出会おう
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default HomePage;