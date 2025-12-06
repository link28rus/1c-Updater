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
  FormControlLabel,
  Switch,
  Chip,
  Typography,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Lock as LockIcon, LockOpen as LockOpenIcon } from '@mui/icons-material'
import { usersService } from '../services/api'
import { useForm } from 'react-hook-form'
import { User } from '../types'

export function AdminUsersPage() {
  const [open, setOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const queryClient = useQueryClient()

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getAll().then((res) => res.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, formState: { errors: passwordErrors } } = useForm()

  const createMutation = useMutation({
    mutationFn: (data: any) => usersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      usersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setOpen(false)
      setEditingUser(null)
      reset()
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      usersService.changePassword(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setPasswordOpen(false)
      resetPassword()
    },
  })

  const blockMutation = useMutation({
    mutationFn: (id: number) => usersService.block(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const unblockMutation = useMutation({
    mutationFn: (id: number) => usersService.unblock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const handleOpen = (user?: User) => {
    if (user) {
      setEditingUser(user)
      reset({
        username: user.username,
        isAdmin: user.isAdmin,
      })
    } else {
      setEditingUser(null)
      reset()
    }
    setOpen(true)
  }

  const handlePasswordOpen = (user: User) => {
    setEditingUser(user)
    setPasswordOpen(true)
    resetPassword()
  }

  const handleClose = () => {
    setOpen(false)
    setEditingUser(null)
    reset()
  }

  const handlePasswordClose = () => {
    setPasswordOpen(false)
    setEditingUser(null)
    resetPassword()
  }

  const onSubmit = (data: any) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const onPasswordSubmit = (data: any) => {
    if (editingUser) {
      changePasswordMutation.mutate({ id: editingUser.id, password: data.password })
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Управление пользователями</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Добавить пользователя
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Имя пользователя</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Дата создания</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users?.map((user: User) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  <Chip
                    label={user.isAdmin ? 'Администратор' : 'Пользователь'}
                    color={user.isAdmin ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.isBlocked ? 'Заблокирован' : 'Активен'}
                    color={user.isBlocked ? 'error' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpen(user)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handlePasswordOpen(user)}
                  >
                    <LockIcon />
                  </IconButton>
                  {user.isBlocked ? (
                    <IconButton
                      size="small"
                      onClick={() => unblockMutation.mutate(user.id)}
                    >
                      <LockOpenIcon />
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={() => blockMutation.mutate(user.id)}
                    >
                      <LockIcon />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => deleteMutation.mutate(user.id)}
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
            {editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Имя пользователя"
              fullWidth
              variant="outlined"
              {...register('username', { required: 'Обязательное поле' })}
              error={!!errors.username}
              helperText={errors.username?.message as string}
              sx={{ mb: 2, mt: 2 }}
            />
            {!editingUser && (
              <TextField
                margin="dense"
                label="Пароль"
                type="password"
                fullWidth
                variant="outlined"
                {...register('password', {
                  required: 'Обязательное поле',
                  minLength: { value: 6, message: 'Минимум 6 символов' },
                })}
                error={!!errors.password}
                helperText={errors.password?.message as string}
                sx={{ mb: 2 }}
              />
            )}
            <FormControlLabel
              control={
                <Switch
                  {...register('isAdmin')}
                  defaultChecked={editingUser?.isAdmin}
                />
              }
              label="Администратор"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Отмена</Button>
            <Button type="submit" variant="contained">
              {editingUser ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={passwordOpen} onClose={handlePasswordClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitPassword(onPasswordSubmit)}>
          <DialogTitle>Изменить пароль</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Новый пароль"
              type="password"
              fullWidth
              variant="outlined"
              {...registerPassword('password', {
                required: 'Обязательное поле',
                minLength: { value: 6, message: 'Минимум 6 символов' },
              })}
              error={!!passwordErrors.password}
              helperText={passwordErrors.password?.message as string}
              sx={{ mb: 2, mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handlePasswordClose}>Отмена</Button>
            <Button type="submit" variant="contained">
              Изменить
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}

