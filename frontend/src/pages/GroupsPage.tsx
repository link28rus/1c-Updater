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
  Typography,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { groupsService } from '../services/api'
import { useForm } from 'react-hook-form'
import { Group } from '../types'

export function GroupsPage() {
  const [open, setOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const queryClient = useQueryClient()

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsService.getAll().then((res) => res.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const createMutation = useMutation({
    mutationFn: (data: any) => groupsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      groupsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setOpen(false)
      setEditingGroup(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => groupsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  const handleOpen = (group?: Group) => {
    if (group) {
      setEditingGroup(group)
      reset({
        name: group.name,
        description: group.description || '',
      })
    } else {
      setEditingGroup(null)
      reset()
    }
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingGroup(null)
    reset()
  }

  const onSubmit = (data: any) => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Управление группами</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Добавить группу
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell>Количество ПК</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups?.map((group: Group) => (
              <TableRow key={group.id}>
                <TableCell>{group.name}</TableCell>
                <TableCell>{group.description || '-'}</TableCell>
                <TableCell>{group.pcs?.length || 0}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpen(group)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => deleteMutation.mutate(group.id)}
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
            {editingGroup ? 'Редактировать группу' : 'Добавить группу'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Название"
              fullWidth
              variant="outlined"
              {...register('name', { required: 'Обязательное поле' })}
              error={!!errors.name}
              helperText={errors.name?.message as string}
              sx={{ mb: 2, mt: 2 }}
            />
            <TextField
              margin="dense"
              label="Описание"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              {...register('description')}
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Отмена</Button>
            <Button type="submit" variant="contained">
              {editingGroup ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}

