export interface ReadingMaterial {
  id: string;
  version: string;
  title: string;
  text: string;
  questions: { prompt: string; options: string[]; answer: number }[];
}
/** External content should implement this interface after rights and item-quality review. */
export interface ReadingProvider {
  id: string;
  version: string;
  list(): ReadingMaterial[];
  get(id: string): ReadingMaterial | undefined;
}
const materials: ReadingMaterial[] = [
  {
    id: 'garden',
    version: '1.0.0',
    title: '一座花园的用水记录',
    text: '社区花园的管理员想减少浇水量。他把同一批幼苗分种在两个大小相近、日照相似的区域。第一个区域每天早晨浇水，第二个区域只在土壤传感器显示干燥时浇水。四周后，第二个区域的用水量少了约三成，两区幼苗的平均高度接近。\n管理员认为，按需浇水值得继续尝试。不过，这次记录只涵盖一个温和的月份，土壤传感器也没有在其他土质中校准。他计划在炎热季节重复观察，并在多个地块交叉使用两种浇水方式，再决定是否向整个社区推广。',
    questions: [
      {
        prompt: '第二个区域何时浇水？',
        options: ['每天早晨', '传感器显示土壤干燥时', '每周一次', '幼苗变矮时'],
        answer: 1,
      },
      {
        prompt: '哪一项最符合目前记录？',
        options: [
          '按需浇水在所有季节都最好',
          '按需浇水用水较少，幼苗平均高度接近',
          '两区域用水完全相同',
          '传感器适用于所有土壤',
        ],
        answer: 1,
      },
      {
        prompt: '管理员下一步的安排主要是为了什么？',
        options: [
          '消除全部测量误差',
          '保证幼苗一定长高',
          '考察结论在不同条件下是否成立',
          '证明日照没有作用',
        ],
        answer: 2,
      },
    ],
  },
  {
    id: 'library',
    version: '1.0.0',
    title: '图书馆延时开放',
    text: '一所社区图书馆试行周三延长两小时开放。第一个月，延长时段平均有二十位读者到访。问卷中，多数受访者表示更方便在下班后借书。馆员同时发现，周三白天的到访人数有所下降，因此总到访人数的增长比延长时段的人数少。\n负责人没有立刻增加更多晚间时段。他指出，问卷只发给到馆读者，无法了解那些仍然不方便到馆的居民。他准备记录三个月的独立读者人数，并邀请未到馆居民参与调查，以判断延时开放是在改变原有读者的到访时间，还是也吸引了新的使用者。',
    questions: [
      {
        prompt: '周三白天到访减少意味着什么？',
        options: [
          '延时完全没有帮助',
          '晚间到访可能部分来自原有时段的转移',
          '白天将停止开放',
          '问卷必然造假',
        ],
        answer: 1,
      },
      {
        prompt: '当前问卷遗漏了谁的意见？',
        options: ['馆员', '所有晚间读者', '未到馆的居民', '所有受访者'],
        answer: 2,
      },
      {
        prompt: '记录独立读者人数有助于区分什么？',
        options: [
          '读者的借书速度',
          '原有读者改变时间与新增使用者',
          '书籍的阅读难度',
          '周三和周四的天气',
        ],
        answer: 1,
      },
    ],
  },
];
export const originalReadingProvider: ReadingProvider = {
  id: 'original-examples',
  version: '1.0.0',
  list: () => materials,
  get: (id) => materials.find((m) => m.id === id),
};
