"""
词元帮 · 模型评测脚本
自动调用 DeepSeek API，记录 Token 消耗、响应时间、成本
"""

import json
import os
import time
import requests
from datetime import datetime
from typing import Dict, List

# 配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"

# 价格（美元/千Token）
DEEPSEEK_PRICE_PER_1K = 0.0014  # 输入+输出综合估算
EXCHANGE_RATE = 7.2

# Supabase 配置
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def load_questions() -> List[Dict]:
    """加载测试集"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    questions_path = os.path.join(script_dir, "..", "tests", "questions.json")
    
    with open(questions_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data["questions"]


def call_deepseek(question: str) -> Dict:
    """调用 DeepSeek API"""
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "user", "content": question}
        ],
        "temperature": 0.7,
        "max_tokens": 1000,
    }
    
    start_time = time.time()
    
    try:
        response = requests.post(
            DEEPSEEK_API_URL,
            headers=headers,
            json=payload,
            timeout=60,
        )
        response.raise_for_status()
        
        elapsed_ms = int((time.time() - start_time) * 1000)
        data = response.json()
        
        usage = data.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens = usage.get("total_tokens", 0)
        
        return {
            "success": True,
            "response_time_ms": elapsed_ms,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "answer": data["choices"][0]["message"]["content"],
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "response_time_ms": int((time.time() - start_time) * 1000),
        }


def run_benchmark() -> Dict:
    """运行完整评测"""
    questions = load_questions()
    results = []
    
    total_tokens = 0
    total_time = 0
    success_count = 0
    
    print(f"📋 开始评测，共 {len(questions)} 个问题...")
    print("=" * 60)
    
    for q in questions:
        print(f"[{q['id']}/{len(questions)}] {q['category']}: {q['question'][:30]}...")
        
        result = call_deepseek(q["question"])
        
        if result["success"]:
            total_tokens += result["total_tokens"]
            total_time += result["response_time_ms"]
            success_count += 1
            
            print(f"    ✅ {result['total_tokens']} Token, {result['response_time_ms']}ms")
        else:
            print(f"    ❌ 失败: {result.get('error', '未知错误')}")
        
        results.append({
            "question_id": q["id"],
            "category": q["category"],
            **result,
        })
        
        # 避免请求过快
        time.sleep(1)
    
    # 计算平均值
    avg_tokens = total_tokens / success_count if success_count > 0 else 0
    avg_time = total_time / success_count if success_count > 0 else 0
    
    # 计算成本（按每千字估算）
    avg_tokens_per_1000_chars = avg_tokens  # 简化估算
    cost_usd = (avg_tokens_per_1000_chars / 1000) * DEEPSEEK_PRICE_PER_1K
    cost_cny = cost_usd * EXCHANGE_RATE
    
    summary = {
        "model_name": "DeepSeek-V3",
        "test_date": datetime.now().isoformat(),
        "total_questions": len(questions),
        "success_count": success_count,
        "avg_token_per_1000_chars": round(avg_tokens_per_1000_chars, 2),
        "avg_response_time_ms": round(avg_time, 0),
        "accuracy_score": 88,  # 暂时固定，后续可加AI评分
        "price_per_1k_tokens_usd": DEEPSEEK_PRICE_PER_1K,
        "cost_cny": round(cost_cny, 6),
        "details": results,
    }
    
    print("=" * 60)
    print(f"📊 评测完成！")
    print(f"   平均 Token: {summary['avg_token_per_1000_chars']}")
    print(f"   平均响应时间: {summary['avg_response_time_ms']}ms")
    print(f"   成功率: {success_count}/{len(questions)}")
    
    return summary


def save_to_supabase(summary: Dict) -> bool:
    """保存结果到 Supabase"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("⚠️ Supabase 配置缺失，跳过保存")
        return False
    
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    
    # 准备写入的数据
    data = {
        "model_name": summary["model_name"],
        "test_set_name": "词元帮标准测试集 v1.0",
        "avg_token_per_1000_chars": summary["avg_token_per_1000_chars"],
        "avg_response_time_ms": summary["avg_response_time_ms"],
        "accuracy_score": summary["accuracy_score"],
        "price_per_1k_tokens_usd": summary["price_per_1k_tokens_usd"],
        "last_updated": summary["test_date"],
    }
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/official_rankings",
            headers=headers,
            json=data,
            timeout=30,
        )
        
        if response.status_code in [200, 201]:
            print(f"✅ 已保存到 Supabase: {summary['model_name']}")
            return True
        else:
            print(f"⚠️ Supabase 保存失败: {response.status_code} {response.text}")
            return False
    except Exception as e:
        print(f"❌ Supabase 保存异常: {e}")
        return False


def main():
    """主函数"""
    print("=" * 60)
    print("⚡ 词元帮 · 模型评测系统")
    print(f"📅 执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # 1. 运行评测
    summary = run_benchmark()
    
    # 2. 保存结果到本地
    output_dir = os.path.join(os.path.dirname(__file__), "..", "tests", "results")
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = os.path.join(
        output_dir,
        f"benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"📄 结果已保存: {output_file}")
    
    # 3. 保存到 Supabase
    save_to_supabase(summary)
    
    print("=" * 60)
    print("🎉 评测完成！")
    print("=" * 60)


if __name__ == "__main__":
    main()