import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  CircularProgress,
} from '@mui/material'
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material'
import { agentsService } from '../services/api'

interface AgentStatus {
  pcId: number
  pcName: string
  pcIpAddress: string
  hasAgent: boolean
  agentId: string | null
  hostname: string | null
  isActive: boolean
  lastHeartbeat: string | null
  lastOneCVersion: string | null
  oneCArchitecture: string | null
}

export function AgentsPage() {
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
  const [selectedPc, setSelectedPc] = useState<AgentStatus | null>(null)
  const serverUrl = (() => {
    // Автоматически определяем URL сервера
    const host = window.location.hostname
    const port = window.location.port || '3001'
    return host === 'localhost' || host === '127.0.0.1' 
      ? `http://${host}:${port}` 
      : `http://${host}:3001`
  })()
  const [downloadingExe, setDownloadingExe] = useState(false)
  const [downloadingInstaller, setDownloadingInstaller] = useState(false)
  const [instructionsExpanded, setInstructionsExpanded] = useState(false)

  const queryClient = useQueryClient()

  const { data: agentsStatus, refetch, isLoading, error } = useQuery({
    queryKey: ['agents-status'],
    queryFn: () => agentsService.getStatus().then((res) => res.data),
    refetchInterval: 30000, // Обновление каждые 30 секунд
    retry: 2,
  })

  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => agentsService.deleteAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents-status'] })
    },
  })

  const handleShowInfo = (pc: AgentStatus) => {
    setSelectedPc(pc)
    setDownloadDialogOpen(true)
  }

  const handleUninstall = (pc: AgentStatus) => {
    if (!pc.agentId) {
      alert('Агент не установлен на этом ПК')
      return
    }

    const result = window.confirm(
      `Вы уверены, что хотите удалить агент с ПК "${pc.pcName}"?\n\n` +
      `Это удалит запись агента из базы данных.\n` +
      `Для полного удаления агента с ПК:\n` +
      `1. Скачайте установщик\n` +
      `2. Запустите его на целевом ПК\n` +
      `3. Нажмите кнопку "Удалить"\n\n` +
      `Продолжить удаление из базы данных?`
    )
    
    if (result) {
      deleteAgentMutation.mutate(pc.agentId, {
        onSuccess: () => {
          alert('Агент успешно удален из базы данных')
        },
        onError: (error: any) => {
          alert(error.response?.data?.message || 'Ошибка удаления агента')
        },
      })
    }
  }

  const handleDownloadExe = async () => {
    setDownloadingExe(true)
    try {
      const response = await agentsService.downloadAgentExe()
      
      // Создаем blob и скачиваем файл
      const blob = new Blob([response.data], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '1CUpdaterAgent.exe'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setDownloadingExe(false)
    } catch (error: any) {
      console.error('Ошибка скачивания exe:', error)
      alert(error.response?.data?.message || 'Ошибка скачивания файла агента. Убедитесь, что проект собран.')
      setDownloadingExe(false)
    }
  }

  const handleDownloadInstaller = async () => {
    setDownloadingInstaller(true)
    try {
      const response = await agentsService.downloadInstaller()
      
      // Создаем blob и скачиваем файл
      const blob = new Blob([response.data], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '1CUpdaterAgentInstaller.exe'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setDownloadingInstaller(false)
    } catch (error: any) {
      console.error('Ошибка скачивания установщика:', error)
      alert(error.response?.data?.message || 'Ошибка скачивания установщика. Убедитесь, что проект собран.')
      setDownloadingInstaller(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleString('ru-RU')
    } catch {
      return dateString
    }
  }

  const getHeartbeatStatus = (lastHeartbeat: string | null, isActive: boolean, hasAgent: boolean) => {
    if (!hasAgent) return 'Не установлен'
    if (!isActive) return 'Неактивен'
    if (!lastHeartbeat) return 'Нет данных'
    
    const lastBeat = new Date(lastHeartbeat)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - lastBeat.getTime()) / 60000)
    
    if (diffMinutes < 2) return 'Активен'
    if (diffMinutes < 5) return 'Недавно'
    return `Оффлайн (${diffMinutes} мин)`
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4">Управление агентами</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={downloadingInstaller ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleDownloadInstaller}
            disabled={downloadingInstaller}
            color="primary"
          >
            {downloadingInstaller ? 'Скачивание...' : 'Скачать установщик'}
          </Button>
          <Button
            variant="outlined"
            startIcon={downloadingExe ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleDownloadExe}
            disabled={downloadingExe}
          >
            {downloadingExe ? 'Скачивание...' : 'Скачать агент (exe)'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            disabled={isLoading}
          >
            Обновить
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Установка агента на удаленные ПК
          </Typography>
          <Typography variant="body2">
            Скачайте установочный скрипт для каждого ПК. Скрипт содержит предзаполненные параметры (ID ПК, URL сервера) и готов к использованию.
            После установки агент автоматически зарегистрируется на сервере и начнет отправлять heartbeat.
          </Typography>
        </Box>
      </Alert>

      <Accordion expanded={instructionsExpanded} onChange={() => setInstructionsExpanded(!instructionsExpanded)} sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="primary" />
            Инструкция по установке агента
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Шаг 1:</strong> Скачайте установщик, нажав кнопку "Скачать установщик" в верхней части страницы
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Шаг 2:</strong> Скачайте файл агента <code>1CUpdaterAgent.exe</code>, нажав кнопку "Скачать агент (exe)"
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Важно:</strong> Оба файла должны находиться в одной папке на целевом ПК
              <br />
              <strong>Примечание:</strong> Установщик включает все необходимые зависимости и не требует установки .NET Runtime
            </Alert>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Шаг 3:</strong> Запустите <code>1CUpdaterAgentInstaller.exe</code> от имени администратора на целевом ПК
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Шаг 4:</strong> В установщике введите:
            </Typography>
            <Box component="ul" sx={{ marginTop: 1, marginBottom: 2, pl: 2 }}>
              <li><strong>ID ПК:</strong> {selectedPc?.pcId || 'X'}</li>
              <li><strong>URL сервера:</strong> {serverUrl || 'http://192.168.25.200:3001'}</li>
            </Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Шаг 5:</strong> Нажмите "Установить" и следите за прогрессом в окне установщика
            </Typography>
            <Typography variant="body2" sx={{ mt: 2, mb: 2 }}>
              <strong>Шаг 6:</strong> После установки агент автоматически зарегистрируется на сервере. Статус установки можно проверить на этой странице.
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Лог установки:</strong> Файл лога создается автоматически рядом с установщиком с именем <code>1CUpdaterAgentInstaller-Install-YYYYMMDD-HHMMSS.log</code>
            </Alert>
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Важно:</strong> Убедитесь, что:
              <Box component="ul" sx={{ marginTop: 1, marginBottom: 0, pl: 2 }}>
                <li>ПК имеет доступ к серверу по указанному URL</li>
                <li>Файрвол не блокирует исходящие соединения</li>
                <li>Скрипт запущен от имени администратора</li>
              </Box>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Ошибка загрузки данных агентов: {error instanceof Error ? error.message : 'Неизвестная ошибка'}
        </Alert>
      )}

      {!isLoading && !error && (!agentsStatus || agentsStatus.length === 0) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Нет доступных ПК. Сначала создайте ПК в разделе "ПК".
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID ПК</TableCell>
              <TableCell>ПК</TableCell>
              <TableCell>IP Адрес</TableCell>
              <TableCell>Статус агента</TableCell>
              <TableCell>Hostname</TableCell>
              <TableCell>Версия 1С</TableCell>
              <TableCell>Архитектура</TableCell>
              <TableCell>Последний heartbeat</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography>Загрузка...</Typography>
                </TableCell>
              </TableRow>
            ) : !agentsStatus || agentsStatus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="textSecondary">Нет данных</Typography>
                </TableCell>
              </TableRow>
            ) : (
              agentsStatus.map((agent: AgentStatus) => {
              const hasAgent = agent.hasAgent
              const heartbeatStatus = getHeartbeatStatus(agent.lastHeartbeat, agent.isActive, hasAgent)
              
              return (
                <TableRow key={agent.pcId}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {agent.pcId}
                    </Typography>
                  </TableCell>
                  <TableCell>{agent.pcName}</TableCell>
                  <TableCell>{agent.pcIpAddress}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={hasAgent ? (agent.isActive ? 'Установлен' : 'Неактивен') : 'Не установлен'}
                        color={hasAgent && agent.isActive ? 'success' : hasAgent ? 'warning' : 'default'}
                        size="small"
                        icon={hasAgent && agent.isActive ? <CheckCircleIcon /> : hasAgent ? <WarningIcon /> : <ErrorIcon />}
                      />
                      {hasAgent && agent.isActive && (
                        <Tooltip title="Агент работает и отправляет heartbeat">
                          <CheckCircleIcon color="success" fontSize="small" />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{agent.hostname || '-'}</TableCell>
                  <TableCell>{agent.lastOneCVersion || '-'}</TableCell>
                  <TableCell>{agent.oneCArchitecture || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title={formatDate(agent.lastHeartbeat)}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{heartbeatStatus}</span>
                        {hasAgent && agent.isActive && (
                          <InfoIcon fontSize="small" color="action" />
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant={hasAgent ? "outlined" : "contained"}
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleShowInfo(agent)}
                        color={hasAgent ? "inherit" : "primary"}
                      >
                        {hasAgent ? 'Переустановить' : 'Установить'}
                      </Button>
                      {hasAgent && (
                        <>
                          <Tooltip title={`Агент установлен. AgentId: ${agent.agentId || 'N/A'}`}>
                            <InfoIcon color="action" fontSize="small" />
                          </Tooltip>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={() => handleUninstall(agent)}
                          >
                            Удалить
                          </Button>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              )
            })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={downloadDialogOpen} onClose={() => setDownloadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ComputerIcon color="primary" />
            <Typography variant="h6">Установка агента</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPc && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  ПК: {selectedPc.pcName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    IP: {selectedPc.pcIpAddress}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '1.1rem' }}>
                    ID ПК: {selectedPc.pcId}
                  </Typography>
                </Box>
                {selectedPc.hasAgent && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Агент уже установлен на этом ПК. Вы можете переустановить или удалить агента через установщик.
                  </Alert>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <TextField
                fullWidth
                label="URL сервера"
                value={serverUrl}
                placeholder="http://192.168.25.200:3001"
                helperText="Этот URL нужно будет ввести в установщике"
                sx={{ mb: 2 }}
                InputProps={{
                  readOnly: true,
                }}
              />

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Параметры для установщика:
                </Typography>
                <Box component="ul" sx={{ margin: 0, pl: 2 }}>
                  <li><strong>ID ПК:</strong> <span style={{ fontWeight: 'bold', color: '#1976d2', fontSize: '1.1rem' }}>{selectedPc.pcId}</span> (это число, не имя ПК!)</li>
                  <li><strong>URL сервера:</strong> {serverUrl || 'автоматически определится'}</li>
                  <li><strong>Имя сервиса:</strong> 1CUpdaterAgent</li>
                </Box>
              </Alert>

              <Alert severity="success" sx={{ mb: 2, bgcolor: 'success.light' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  ⚠️ Важно: ID ПК для установщика
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  При установке агента в установщике нужно ввести:
                </Typography>
                <Box sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 1, border: '2px solid', borderColor: 'primary.main' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '1.2rem' }}>
                    ID ПК: {selectedPc.pcId}
                  </Typography>
                </Box>
              </Alert>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  После скачивания:
                </Typography>
                <Box component="ol" sx={{ margin: 0, pl: 2 }}>
                  <li>Скачайте <strong>установщик</strong> (1CUpdaterAgentInstaller.exe) и <strong>агент</strong> (1CUpdaterAgent.exe)</li>
                  <li>Поместите оба файла в одну папку на целевом ПК</li>
                  <li>Запустите <code>1CUpdaterAgentInstaller.exe</code> от имени администратора</li>
                  <li>Выберите <strong>папку установки</strong> (по умолчанию: Program Files\1CUpdaterAgent)</li>
                  <li>Введите <strong>ID ПК: {selectedPc.pcId}</strong> и URL сервера: <strong>{serverUrl}</strong></li>
                  <li>Нажмите "Установить" и следите за прогрессом</li>
                  <li>Для удаления агента используйте кнопку "Удалить" в установщике</li>
                  <li>Проверьте статус установки на этой странице</li>
                  <li>При проблемах проверьте лог установки рядом с установщиком</li>
                </Box>
              </Alert>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Если установка не работает:
                </Typography>
                <Box component="ul" sx={{ margin: 0, pl: 2 }}>
                  <li>Убедитесь, что оба файла (установщик и агент) находятся в одной папке</li>
                  <li>Проверьте, что установщик запущен от имени администратора</li>
                  <li>Проверьте лог установки рядом с установщиком</li>
                  <li>Проверьте логи службы: <code>Get-EventLog -LogName Application -Source "1CUpdaterAgent" -Newest 10</code></li>
                  <li>Убедитесь, что антивирус не блокирует файлы</li>
                </Box>
              </Alert>

            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDownloadDialogOpen(false)} 
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

