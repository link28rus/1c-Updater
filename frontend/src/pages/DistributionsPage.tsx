import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  Alert,
  Typography,
} from '@mui/material'
import { CloudUpload as CloudUploadIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { distributionsService } from '../services/api'
import { Distribution } from '../types'

export function DistributionsPage() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  const { data: distributions } = useQuery({
    queryKey: ['distributions'],
    queryFn: () => distributionsService.getAll().then((res) => res.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => distributionsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributions'] })
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      await distributionsService.upload(file, description || undefined)
      setOpen(false)
      setFile(null)
      setDescription('')
      queryClient.invalidateQueries({ queryKey: ['distributions'] })
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Дистрибутивы</Typography>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => setOpen(true)}
        >
          Загрузить дистрибутив
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Имя файла</TableCell>
              <TableCell>Версия</TableCell>
              <TableCell>Архитектура</TableCell>
              <TableCell>Размер</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell>Дата загрузки</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {distributions?.map((dist: Distribution) => (
              <TableRow key={dist.id}>
                <TableCell>{dist.filename}</TableCell>
                <TableCell>{dist.version}</TableCell>
                <TableCell>{dist.architecture}</TableCell>
                <TableCell>{formatFileSize(dist.fileSize)}</TableCell>
                <TableCell>{dist.description || '-'}</TableCell>
                <TableCell>
                  {new Date(dist.createdAt).toLocaleDateString('ru-RU')}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => deleteMutation.mutate(dist.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Загрузить дистрибутив</DialogTitle>
        <DialogContent>
          {uploading && <LinearProgress sx={{ mb: 2 }} />}
          <TextField
            margin="dense"
            label="Описание (необязательно)"
            fullWidth
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            variant="outlined"
            component="label"
            fullWidth
            sx={{ mb: 2 }}
          >
            {file ? file.name : 'Выбрать файл'}
            <input
              type="file"
              hidden
              accept=".zip,.rar,.msi,.exe"
              onChange={handleFileChange}
            />
          </Button>
          {file && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Выбран {file.name.endsWith('.zip') || file.name.endsWith('.rar') ? 'архив' : 'файл'}: {file.name} ({formatFileSize(file.size)})
              {(file.name.endsWith('.zip') || file.name.endsWith('.rar')) && (
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Все файлы из архива будут распакованы и сохранены
                </Typography>
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={uploading}>
            Отмена
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!file || uploading}
          >
            {uploading ? 'Загрузка...' : 'Загрузить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

