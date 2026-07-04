import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultRoles = [
    {
      name: 'planner',
      description: '负责任务规划和拆解，制定执行方案',
      promptTemplate: '你是任务策划角色。你的职责是分析用户需求，拆解任务步骤，制定详细的执行方案和时间线。请确保方案可行、步骤清晰。',
      reportTo: null,
      responsibilities: '需求分析、任务拆解、方案制定、进度规划',
      isActive: true,
    },
    {
      name: 'executor',
      description: '负责执行具体任务，完成开发和实现工作',
      promptTemplate: '你是任务执行角色。你的职责是根据策划方案，完成具体的开发、编写和实现工作。请确保代码质量高、功能完整。',
      reportTo: 'planner',
      responsibilities: '代码编写、功能实现、Bug修复、单元测试',
      isActive: true,
    },
    {
      name: 'reviewer',
      description: '负责代码审查和质量把控',
      promptTemplate: '你是代码审核角色。你的职责是审查代码质量、安全性、性能和可维护性。请提供详细的审查意见和改进建议。',
      reportTo: 'planner',
      responsibilities: '代码审查、质量把控、安全审计、性能优化建议',
      isActive: true,
    },
    {
      name: 'tester',
      description: '负责测试验证和质量保证',
      promptTemplate: '你是测试角色。你的职责是设计测试用例、执行测试、报告缺陷。请确保测试覆盖全面、结果准确。',
      reportTo: 'planner',
      responsibilities: '测试用例设计、功能测试、回归测试、缺陷报告',
      isActive: true,
    },
  ];

  for (const role of defaultRoles) {
    const existing = await prisma.role.findUnique({ where: { name: role.name } });
    if (!existing) {
      await prisma.role.create({ data: role });
      console.log(`Created role: ${role.name}`);
    } else {
      console.log(`Role already exists: ${role.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
