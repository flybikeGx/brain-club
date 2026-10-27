import { ArrowUpRight, BookOpen, Brain, FlaskConical, Leaf, ShieldCheck } from 'lucide-react';
import { evidenceReferences } from '@/lib/evidence';
import { CardTitle, Notice, PageHeading } from '@/components/ui';
export default function Evidence() {
  return (
    <>
      <PageHeading
        eyebrow="SCIENCE & LIMITATIONS"
        title="以练习为起点，以证据为边界。"
        description="了解我们测量什么，以及这些成绩不能说明什么。"
      />
      <section className="card">
        <CardTitle title="我们的训练主张" subtitle="适用于健康成年人的自主练习，不提供临床用途" />
        <div className="evidence-level">
          <Brain size={22} />
          <div>
            <h3>先谈专项表现，再讨论迁移。</h3>
            <p>
              反复练习通常能使人熟悉受训任务。若要讨论近迁移，需要独立且不同形式的测验；远迁移更需要充分证据。本项目尚未进行这类效果验证，不能保证提高
              IQ、总体智力或日常工作能力。{' '}
              <a
                className="text-link"
                href={evidenceReferences[0].url}
                target="_blank"
                rel="noreferrer"
              >
                Simons et al., 2016 <ArrowUpRight size={11} />
              </a>
            </p>
          </div>
        </div>
        <div className="evidence-level">
          <BookOpen size={22} />
          <div>
            <h3>真实知识记忆，需要练习提取真实内容。</h3>
            <p>
              主动提取与间隔练习具有较好的学习研究依据。数字序列训练无法替代真实知识复习。本版尚未实现知识卡片与间隔调度，对应器械明确标为规划中。{' '}
              <a
                className="text-link"
                href={evidenceReferences[1].url}
                target="_blank"
                rel="noreferrer"
              >
                Dunlosky et al., 2013 <ArrowUpRight size={11} />
              </a>
            </p>
          </div>
        </div>
        <div className="evidence-level">
          <Leaf size={22} />
          <div>
            <h3>正念是一种练习过程，不是注意力考试。</h3>
            <p>
              研究中的正念课程、参与者与练习剂量各不相同，认知效果也存在差异。这里提供的是简短集中式注意练习，不把研究中的课程效果直接套用到本产品上。觉察按钮只记录自愿点击，无法测量真实走神比例。{' '}
              <a
                className="text-link"
                href={evidenceReferences[2].url}
                target="_blank"
                rel="noreferrer"
              >
                Whitfield et al., 2022 <ArrowUpRight size={11} />
              </a>
            </p>
          </div>
        </div>
        <Notice>
          MindGym 不诊断
          ADHD，不治疗认知障碍，不替代专业评估。没有人群常模，不显示“超过多少人”，也不生成 IQ
          或“脑力总分”。
        </Notice>
      </section>
      <div className="two-columns section-gap">
        <section className="card">
          <CardTitle title="如何理解个人成绩" />
          <ol className="instructions">
            <li>本次成绩：在当前设备、设置与状态下实际测得的任务表现。</li>
            <li>历史变化：比较同一任务、同一版本、同一初始配置的有效记录。</li>
            <li>测量波动：睡眠、疲劳、输入设备、随机题目与环境变化都可能影响结果。</li>
            <li>练习效应：策略更熟练可以提升分数，并不一定说明认知能力广泛改变。</li>
            <li>未知部分：一般智力、日常迁移与临床状态，均不能由这些成绩确定。</li>
          </ol>
        </section>
        <section className="card">
          <CardTitle title="测量与生成的边界" />
          <p className="subtle" style={{ lineHeight: 2.2 }}>
            我们用 performance.now()
            测量时间，并在失焦或切到后台时暂停或作废。浏览器的屏幕呈现与键盘输入仍存在延迟，本产品没有完成实验室硬件校准。
          </p>
          <p className="subtle section-gap" style={{ lineHeight: 2.2 }}>
            大规模种子空间提供可复现的程序题目，不代表无限种认知要求。同一套生成规则可能被用户学会固定策略。阅读只有少量原创样本，未标准化；当前体测亦不能替代经验证的量表。
          </p>
          <a
            className="text-link section-gap"
            href={evidenceReferences[3].url}
            target="_blank"
            rel="noreferrer"
          >
            浏览器计时研究 · Bridges et al., 2020 <ArrowUpRight size={12} />
          </a>
        </section>
      </div>
      <section className="card section-gap">
        <CardTitle title="参考资料" subtitle="文献提供设计背景，不构成本产品有效性的验证" />
        {evidenceReferences.map((r) => (
          <article key={r.id} className="reference">
            <a target="_blank" rel="noreferrer" href={r.url}>
              {r.title} <ArrowUpRight size={12} style={{ display: 'inline' }} />
            </a>
            <p>
              {r.authors} · {r.year}
            </p>
            <p>{r.note}</p>
          </article>
        ))}
      </section>
    </>
  );
}
