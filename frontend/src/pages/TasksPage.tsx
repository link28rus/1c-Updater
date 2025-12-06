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
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography,
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { tasksService, distributionsService, pcsService, groupsService } from '../services/api'
import { useForm, Controller } from 'react-hook-form'
import { Task } from '../types'

export function TasksPage() {
  const [open, setOpen] = useState(false)
  const [selectedPcs, setSelectedPcs] = useState<number[]>([])
  const queryClient = useQueryClient()

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksService.getAll().then((res) => res.data),
  })

  const { data: distributions } = useQuery({
    queryKey: ['distributions'],
    queryFn: () => distributionsService.getAll().then((res) => res.data),
  })

  const { data: pcs } = useQuery({
    queryKey: ['pcs'],
    queryFn: () => pcsService.getAll().then((res) => res.data),
  })

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsService.getAll().then((res) => res.data),
  })

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      description: '',
      distributionId: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => tasksService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setOpen(false)
      reset()
      setSelectedPcs([])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tasksService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const handleTogglePc = (pcId: number) => {
    setSelectedPcs((prev) =>
      prev.includes(pcId)
        ? prev.filter((id) => id !== pcId)
        : [...prev, pcId]
    )
  }

  const handleSelectGroup = (groupId: number) => {
    const groupPcs = pcs?.filter((pc: any) => pc.groupId === groupId) || []
    const groupPcIds = groupPcs.map((pc: any) => pc.id)
    setSelectedPcs((prev) => [...new Set([...prev, ...groupPcIds])])
  }

  const onSubmit = (data: any) => {
    if (selectedPcs.length === 0) {
      alert('Выберите хотя бы один ПК')
      return
    }
    
    // Проверяем, что distributionId не пустой
    if (!data.distributionId || data.distributionId === '' || data.distributionId === null || data.distributionId === undefined) {
      alert('Выберите дистрибутив')
      return
    }

    // Преобразуем distributionId в число
    // Проверяем, что это не UUID (UUID содержит дефисы)
    let distributionIdNum: number;
    if (typeof data.distributionId === 'string') {
      // Если это UUID (содержит дефисы), это ошибка - ID должен быть числом
      if (data.distributionId.includes('-')) {
        console.error('Invalid distributionId: UUID detected, expected number:', data.distributionId);
        alert('Ошибка: получен некорректный ID дистрибутива. Пожалуйста, обновите страницу и попробуйте снова.')
        return
      }
      distributionIdNum = parseInt(data.distributionId, 10);
    } else {
      distributionIdNum = Number(data.distributionId);
    }

    if (isNaN(distributionIdNum) || distributionIdNum <= 0) {
      console.error('Invalid distributionId:', data.distributionId, 'Type:', typeof data.distributionId);
      alert('Некорректный ID дистрибутива. Пожалуйста, выберите дистрибутив из списка.')
      return
    }

    console.log('Submitting task with:', {
      name: data.name,
      description: data.description,
      distributionId: distributionIdNum,
      pcIds: selectedPcs,
    });

    createMutation.mutate({
      name: data.name,
      description: data.description || '',
      distributionId: distributionIdNum,
      pcIds: selectedPcs.map(id => Number(id)),
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'info'
      case 'failed':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Задачи обновления</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Создать задачу
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Дистрибутив</TableCell>
              <TableCell>Версия</TableCell>
              <TableCell>Количество ПК</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Дата создания</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks?.map((task: Task) => (
              <TableRow key={task.id}>
                <TableCell>{task.name}</TableCell>
                <TableCell>{task.distribution?.filename || 'N/A'}</TableCell>
                <TableCell>
                  {task.distribution 
                    ? `${task.distribution.version} (${task.distribution.architecture})`
                    : 'N/A'}
                </TableCell>
                <TableCell>{task.pcs?.length || 0}</TableCell>
                <TableCell>
                  <Chip
                    label={task.status}
                    color={getStatusColor(task.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => deleteMutation.mutate(task.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Создать задачу обновления</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Название задачи"
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
              rows={2}
              {...register('description')}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }} error={!!errors.distributionId}>
              <InputLabel>Дистрибутив</InputLabel>
              <Controller
                name="distributionId"
                control={control}
                rules={{ required: 'Обязательное поле' }}
                render={({ field }) => (
                  <Select
                    label="Дистрибутив"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                  >
                    {distributions?.map((dist: any) => (
                      <MenuItem key={dist.id} value={dist.id}>
                        {dist.filename} - {dist.version} ({dist.architecture})
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.distributionId && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.distributionId.message as string}
                </Typography>
              )}
            </FormControl>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Выбор ПК
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" gutterBottom>
                  Группы:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {groups?.map((group: any) => (
                    <Button
                      key={group.id}
                      size="small"
                      variant="outlined"
                      onClick={() => handleSelectGroup(group.id)}
                    >
                      {group.name}
                    </Button>
                  ))}
                </Box>
              </Box>
              <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', p: 1 }}>
                <FormGroup>
                  {pcs?.map((pc: any) => (
                    <FormControlLabel
                      key={pc.id}
                      control={
                        <Checkbox
                          checked={selectedPcs.includes(pc.id)}
                          onChange={() => handleTogglePc(pc.id)}
                        />
                      }
                      label={`${pc.name} (${pc.ipAddress})`}
                    />
                  ))}
                </FormGroup>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" variant="contained">
              Создать
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}

