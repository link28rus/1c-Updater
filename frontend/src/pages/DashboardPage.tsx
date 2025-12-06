import { useQuery } from '@tanstack/react-query'
import { Grid, Paper, Typography, Box } from '@mui/material'
import { pcsService, tasksService, distributionsService } from '../services/api'

export function DashboardPage() {
  const { data: pcs } = useQuery({
    queryKey: ['pcs'],
    queryFn: () => pcsService.getAll().then((res) => res.data),
  })

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksService.getAll().then((res) => res.data),
  })

  const { data: distributions } = useQuery({
    queryKey: ['distributions'],
    queryFn: () => distributionsService.getAll().then((res) => res.data),
  })

  const onlinePcs = pcs?.filter((pc: any) => pc.isOnline).length || 0
  const totalPcs = pcs?.length || 0
  const pendingTasks = tasks?.filter((task: any) => task.status === 'pending').length || 0

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Главная панель
      </Typography>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary" gutterBottom>
              Всего ПК
            </Typography>
            <Typography variant="h4">{totalPcs}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary" gutterBottom>
              Онлайн ПК
            </Typography>
            <Typography variant="h4" color="success.main">
              {onlinePcs}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary" gutterBottom>
              Активные задачи
            </Typography>
            <Typography variant="h4">{pendingTasks}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary" gutterBottom>
              Дистрибутивы
            </Typography>
            <Typography variant="h4">{distributions?.length || 0}</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}


