import type { EvidenceReference } from '@/domain/types';
export const evidenceReferences: EvidenceReference[] = [
  {
    id: 'simons2016',
    title: 'Do “Brain-Training” Programs Work?',
    authors: 'Simons, Boot, Charness, Gathercole, Chabris, Hambrick & Stine-Morrow',
    year: 2016,
    url: 'https://www.psychologicalscience.org/publications/brain-training.html',
    note: '综述区分受训任务进步、近迁移与远迁移。任务练熟并不能直接支持广泛认知收益的宣传。',
  },
  {
    id: 'dunlosky2013',
    title: 'Improving Students’ Learning With Effective Learning Techniques',
    authors: 'Dunlosky, Rawson, Marsh, Nathan & Willingham',
    year: 2013,
    url: 'https://doi.org/10.1177/1529100612453266',
    note: '主动测试与分散练习获得较高效用评价。它们更贴近真实知识的记忆目标；本版相应器械仍在规划中。',
  },
  {
    id: 'whitfield2022',
    title: 'The Effect of Mindfulness-based Programs on Cognitive Function in Adults',
    authors: 'Whitfield et al.',
    year: 2022,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9381612/',
    note: '系统综述显示不同认知领域的效果并不一致，并建议采用更严谨的方法。研究课程与本项目的简短自助练习并不等价。',
  },
  {
    id: 'bridges2020',
    title:
      'The timing mega-study: comparing a range of experiment generators, both lab-based and online',
    authors: 'Bridges, Pitiot, MacAskill & Peirce',
    year: 2020,
    url: 'https://peerj.com/articles/9414/',
    note: '研究比较实验软件与在线呈现的时序表现。设备、系统与输入路径影响测量，使用单调时钟不等于硬件已校准。',
  },
];
