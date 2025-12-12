import { useQuery } from '@tanstack/react-query'
import {
  Grid,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material'
import { reportsService } from '../services/api'

export function ReportsPage() {
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => reportsService.getDashboardStats().then((res) => res.data),
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  })

  const { data: taskStats, isLoading: taskStatsLoading } = useQuery({
    queryKey: ['reports', 'tasks'],
    queryFn: () => reportsService.getTaskStatistics().then((res) => res.data),
  })

  const { data: pcStats, isLoading: pcStatsLoading } = useQuery({
    queryKey: ['reports', 'pcs'],
    queryFn: () => reportsService.getPcStatistics().then((res) => res.data),
  })

  const { data: taskHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['reports', 'history'],
    queryFn: () => reportsService.getTaskHistory(20).then((res) => res.data),
  })

  // const { data: distStats, isLoading: distStatsLoading } = useQuery({
  //   queryKey: ['reports', 'distributions'],
  //   queryFn: () => reportsService.getDistributionStatistics().then((res) => res.data),
  // })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'failed':
        return 'error'
      case 'in_progress':
        return 'info'
      case 'pending':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (statsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Отчеты и статистика
      </Typography>

      {/* Общая статистика */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary" gutterBottom>
              Всего ПК
            </Typography>
            <Typography variant="h4">{dashboardStats?.pcs?.total || 0}</Typography>
            <Typography variant="body2" color="text.secondary">
              Онлайн: {dashboardStats?.pcs?.online || 0}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary" gutterBottom>
              Агенты
            </Typography>
            <Typography variant="h4">{dashboardStats?.agents?.active || 0}</Typography>
            <Typography variant="body2" color="text.secondary">
              Активных из {dashboardStats?.agents?.total || 0}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary" gutterBottom>
              Задачи
            </Typography>
            <Typography variant="h4">{dashboardStats?.tasks?.total || 0}</Typography>
            <Typography variant="body2" color="text.secondary">
              Выполнено: {dashboardStats?.tasks?.completed || 0}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary" gutterBottom>
              Дистрибутивы
            </Typography>
            <Typography variant="h4">{dashboardStats?.distributions?.total || 0}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Статистика по задачам */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Статистика по задачам
        </Typography>
        {taskStatsLoading ? (
          <CircularProgress />
        ) : (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Статусы задач:</Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={`Ожидающие: ${taskStats?.tasks?.byStatus?.pending || 0}`}
                  color="warning"
                  sx={{ mr: 1, mb: 1 }}
                />
                <Chip
                  label={`В процессе: ${taskStats?.tasks?.byStatus?.in_progress || 0}`}
                  color="info"
                  sx={{ mr: 1, mb: 1 }}
                />
                <Chip
                  label={`Завершено: ${taskStats?.tasks?.byStatus?.completed || 0}`}
                  color="success"
                  sx={{ mr: 1, mb: 1 }}
                />
                <Chip
                  label={`Ошибки: ${taskStats?.tasks?.byStatus?.failed || 0}`}
                  color="error"
                  sx={{ mr: 1, mb: 1 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Успешность выполнения:</Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                {taskStats?.taskPcs?.successRate || '0.00'}%
              </Typography>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Статистика по ПК */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Статистика по ПК
        </Typography>
        {pcStatsLoading ? (
          <CircularProgress />
        ) : (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2">Онлайн: {pcStats?.online || 0}</Typography>
              <Typography variant="body2">Оффлайн: {pcStats?.offline || 0}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2">
                С установленной 1С: {pcStats?.withOneC || 0}
              </Typography>
              <Typography variant="body2">
                Без 1С: {pcStats?.withoutOneC || 0}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2">Архитектура:</Typography>
              <Typography variant="body2">x64: {pcStats?.architecture?.x64 || 0}</Typography>
              <Typography variant="body2">x86: {pcStats?.architecture?.x86 || 0}</Typography>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* История задач */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          История задач
        </Typography>
        {historyLoading ? (
          <CircularProgress />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Название</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Версия</TableCell>
                  <TableCell>ПК</TableCell>
                  <TableCell>Создана</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {taskHistory?.map((task: any) => (
                  <TableRow key={task.id}>
                    <TableCell>{task.id}</TableCell>
                    <TableCell>{task.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={task.status}
                        color={getStatusColor(task.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {task.distribution
                        ? `${task.distribution.version} (${task.distribution.architecture})`
                        : '-'}
                    </TableCell>
                    <TableCell>{task.pcsCount}</TableCell>
                    <TableCell>
                      {new Date(task.createdAt).toLocaleString('ru-RU')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  )
}

