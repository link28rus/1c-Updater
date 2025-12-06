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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { pcsService, groupsService } from '../services/api'
import { useForm } from 'react-hook-form'
import { PC } from '../types'

export function PCsPage() {
  const [open, setOpen] = useState(false)
  const [editingPc, setEditingPc] = useState<PC | null>(null)
  const queryClient = useQueryClient()

  const { data: pcs } = useQuery({
    queryKey: ['pcs'],
    queryFn: () => pcsService.getAll().then((res) => res.data),
  })

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsService.getAll().then((res) => res.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const createMutation = useMutation({
    mutationFn: (data: any) => pcsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs'] })
      setOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      pcsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs'] })
      setOpen(false)
      setEditingPc(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => pcsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcs'] })
    },
  })

  const handleOpen = (pc?: PC) => {
    if (pc) {
      setEditingPc(pc)
      reset({
        name: pc.name,
        ipAddress: pc.ipAddress,
        description: pc.description || '',
        adminUsername: pc.adminUsername,
        groupId: pc.group?.id || '',
      })
    } else {
      setEditingPc(null)
      reset()
    }
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingPc(null)
    reset()
  }

  const onSubmit = (data: any) => {
    // Преобразуем groupId: пустая строка -> undefined, иначе число
    const processedData = {
      ...data,
      groupId: data.groupId === '' || data.groupId === null ? undefined : Number(data.groupId),
    }
    
    if (editingPc) {
      updateMutation.mutate({ id: editingPc.id, data: processedData })
    } else {
      createMutation.mutate(processedData)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Управление ПК</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Добавить ПК
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Имя</TableCell>
              <TableCell>IP адрес</TableCell>
              <TableCell>Группа</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Версия 1С</TableCell>
              <TableCell>Архитектура</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pcs?.map((pc: PC) => (
              <TableRow key={pc.id}>
                <TableCell>{pc.name}</TableCell>
                <TableCell>{pc.ipAddress}</TableCell>
                <TableCell>{pc.group?.name || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={pc.isOnline ? 'Онлайн' : 'Офлайн'}
                    color={pc.isOnline ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{pc.lastOneCVersion || '-'}</TableCell>
                <TableCell>{pc.oneCArchitecture || '-'}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpen(pc)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => deleteMutation.mutate(pc.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingPc ? 'Редактировать ПК' : 'Добавить ПК'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Имя"
              fullWidth
              variant="outlined"
              {...register('name', { required: 'Обязательное поле' })}
              error={!!errors.name}
              helperText={errors.name?.message as string}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="IP адрес"
              fullWidth
              variant="outlined"
              {...register('ipAddress', { required: 'Обязательное поле' })}
              error={!!errors.ipAddress}
              helperText={errors.ipAddress?.message as string}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Описание"
              fullWidth
              variant="outlined"
              {...register('description')}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Имя пользователя администратора"
              fullWidth
              variant="outlined"
              {...register('adminUsername', { required: 'Обязательное поле' })}
              error={!!errors.adminUsername}
              helperText={errors.adminUsername?.message as string}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Пароль администратора"
              type="password"
              fullWidth
              variant="outlined"
              {...register('adminPassword', {
                required: !editingPc ? 'Обязательное поле' : false,
              })}
              error={!!errors.adminPassword}
              helperText={errors.adminPassword?.message as string}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Группа</InputLabel>
              <Select
                {...register('groupId')}
                label="Группа"
                defaultValue=""
              >
                <MenuItem value="">Без группы</MenuItem>
                {groups?.map((group: any) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Отмена</Button>
            <Button type="submit" variant="contained">
              {editingPc ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}

