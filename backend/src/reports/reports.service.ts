import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task, TaskPC, TaskStatus, TaskPcStatus } from '../tasks/entities/task.entity';
import { PC } from '../pcs/entities/pc.entity';
import { AgentRegistration } from '../agent/entities/agent-registration.entity';
import { Distribution } from '../distributions/entities/distribution.entity';
import { User } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(TaskPC)
    private taskPcRepository: Repository<TaskPC>,
    @InjectRepository(PC)
    private pcsRepository: Repository<PC>,
    @InjectRepository(AgentRegistration)
    private agentsRepository: Repository<AgentRegistration>,
    @InjectRepository(Distribution)
    private distributionsRepository: Repository<Distribution>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
  ) {}

  async getDashboardStats() {
    const [
      totalPcs,
      onlinePcs,
      totalAgents,
      activeAgents,
      totalTasks,
      completedTasks,
      failedTasks,
      pendingTasks,
      totalDistributions,
      totalUsers,
      totalGroups,
    ] = await Promise.all([
      this.pcsRepository.count(),
      this.pcsRepository.count({ where: { isOnline: true } }),
      this.agentsRepository.count(),
      this.agentsRepository.count({ where: { isActive: true } }),
      this.tasksRepository.count(),
      this.tasksRepository.count({ where: { status: TaskStatus.COMPLETED } }),
      this.tasksRepository.count({ where: { status: TaskStatus.FAILED } }),
      this.tasksRepository.count({ where: { status: TaskStatus.PENDING } }),
      this.distributionsRepository.count(),
      this.usersRepository.count(),
      this.groupsRepository.count(),
    ]);

    return {
      pcs: {
        total: totalPcs,
        online: onlinePcs,
        offline: totalPcs - onlinePcs,
      },
      agents: {
        total: totalAgents,
        active: activeAgents,
        inactive: totalAgents - activeAgents,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        failed: failedTasks,
        pending: pendingTasks,
        inProgress: totalTasks - completedTasks - failedTasks - pendingTasks,
      },
      distributions: {
        total: totalDistributions,
      },
      users: {
        total: totalUsers,
      },
      groups: {
        total: totalGroups,
      },
    };
  }

  async getTaskStatistics(startDate?: Date, endDate?: Date) {
    const queryBuilder = this.tasksRepository.createQueryBuilder('task');

    if (startDate) {
      queryBuilder.andWhere('task.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('task.createdAt <= :endDate', { endDate });
    }

    const tasks = await queryBuilder.getMany();

    const taskIds = tasks.map((t) => t.id);
    const taskPcs = taskIds.length > 0
      ? await this.taskPcRepository.find({
          where: {
            taskId: In(taskIds),
          },
        })
      : [];

    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    tasks.forEach((task) => {
      statusCounts[task.status]++;
    });

    const taskPcStatusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    };

    taskPcs.forEach((taskPc) => {
      taskPcStatusCounts[taskPc.status]++;
    });

    return {
      tasks: {
        total: tasks.length,
        byStatus: statusCounts,
      },
      taskPcs: {
        total: taskPcs.length,
        byStatus: taskPcStatusCounts,
        successRate:
          taskPcs.length > 0
            ? (
                (taskPcStatusCounts.completed /
                  (taskPcStatusCounts.completed + taskPcStatusCounts.failed)) *
                100
              ).toFixed(2)
            : '0.00',
      },
    };
  }

  async getPcStatistics() {
    const pcs = await this.pcsRepository.find({
      relations: ['group'],
    });

    const onlineCount = pcs.filter((pc) => pc.isOnline).length;
    const offlineCount = pcs.length - onlineCount;

    const pcsWithOneC = pcs.filter((pc) => pc.lastOneCVersion).length;
    const pcsWithoutOneC = pcs.length - pcsWithOneC;

    const architectureCounts = {
      x64: 0,
      x86: 0,
      unknown: 0,
    };

    pcs.forEach((pc) => {
      if (pc.oneCArchitecture === 'x64') {
        architectureCounts.x64++;
      } else if (pc.oneCArchitecture === 'x86') {
        architectureCounts.x86++;
      } else {
        architectureCounts.unknown++;
      }
    });

    return {
      total: pcs.length,
      online: onlineCount,
      offline: offlineCount,
      withOneC: pcsWithOneC,
      withoutOneC: pcsWithoutOneC,
      architecture: architectureCounts,
    };
  }

  async getTaskHistory(limit: number = 50) {
    const tasks = await this.tasksRepository.find({
      relations: ['distribution', 'pcs'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return tasks.map((task) => ({
      id: task.id,
      name: task.name,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      distribution: task.distribution
        ? {
            id: task.distribution.id,
            version: task.distribution.version,
            architecture: task.distribution.architecture,
          }
        : null,
      pcsCount: task.pcs ? task.pcs.length : 0,
    }));
  }

  async getDistributionStatistics() {
    const distributions = await this.distributionsRepository.find({
      order: { createdAt: 'DESC' },
    });

    const architectureCounts = {
      x64: 0,
      x86: 0,
    };

    distributions.forEach((dist) => {
      if (dist.architecture === 'x64') {
        architectureCounts.x64++;
      } else {
        architectureCounts.x86++;
      }
    });

    return {
      total: distributions.length,
      byArchitecture: architectureCounts,
      latest: distributions.length > 0
        ? {
            id: distributions[0].id,
            version: distributions[0].version,
            architecture: distributions[0].architecture,
            createdAt: distributions[0].createdAt,
          }
        : null,
    };
  }
}

