from __future__ import annotations

import csv
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def read_csv(name: str) -> list[dict[str, str]]:
    with (DATA / name).open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


@dataclass
class Store:
    products: list[dict[str, str]]
    orders: list[dict[str, str]]
    items: list[dict[str, str]]
    customers: list[dict[str, str]]
    promotions: list[dict[str, str]]
    policies: str

    @classmethod
    def load(cls) -> "Store":
        return cls(read_csv("products.csv"), read_csv("orders.csv"), read_csv("order_items.csv"),
                   read_csv("customers.csv"), read_csv("promotions.csv"),
                   (DATA / "policies.md").read_text(encoding="utf-8"))

    def catalog(self, query: str, max_price: float | None = None, limit: int = 8) -> list[dict[str, Any]]:
        ignored = {"quais", "opções", "opcoes", "disponíveis", "disponiveis", "custando", "até", "ate", "menos", "preço", "preco", "estoque", "instrumento", "instrumentos", "violões", "violoes", "violão", "violao", "guitarras", "guitarra", "baixos", "baixo", "teclados", "teclado", "baterias", "bateria", "ukuleles", "ukulele"}
        terms = [x.casefold() for x in re.findall(r"[\w-]+", query, flags=re.UNICODE)
                 if len(x) > 2 and x.casefold() not in ignored and not x.casefold().startswith("r$")]
        out = []
        for p in self.products:
            if p.get("status", "").casefold() != "active":
                continue
            price = float(p["price_brl"])
            if max_price is not None and price > max_price:
                continue
            text = " ".join(p.get(k, "") for k in ("name", "description", "specs")).casefold()
            if terms and not any(t in text for t in terms):
                continue
            out.append({"name": p["name"], "price_brl": price, "stock": int(p["stock_quantity"]),
                        "description": p.get("description", "")})
        category = next((t for t in ("violão", "violões", "violao", "violoes", "guitarra", "guitarras", "baixo", "baixos", "teclado", "teclados", "bateria", "baterias", "ukulele", "ukuleles") if t in query.casefold()), None)
        if category:
            category_forms = {"violões": ("violão", "violoes"), "violoes": ("violão", "violoes"), "violão": ("violão", "violoes"), "violao": ("violão", "violoes"), "guitarras": ("guitarra",), "guitarra": ("guitarra",), "baixos": ("baixo",), "baixo": ("baixo",), "teclados": ("teclado", "piano"), "teclado": ("teclado", "piano"), "baterias": ("bateria",), "bateria": ("bateria",), "ukuleles": ("ukulele",), "ukulele": ("ukulele",)}
            out = [p for p in out if any(term in (p["name"] + " " + p["description"]).casefold() for term in category_forms[category])]
        return sorted(out, key=lambda x: x["price_brl"])[:limit]

    def promotion(self, query: str) -> list[dict[str, Any]]:
        matches = []
        for promo in self.promotions:
            p = next((x for x in self.products if x["product_id"] == promo["product_id"]), None)
            if not p or not any(t in p["name"].casefold() for t in re.findall(r"[\w-]+", query.casefold()) if len(t) > 2):
                continue
            matches.append({"name": p["name"], "price_brl": float(p["price_brl"]),
                            "discount_percent": float(promo["discount_percent"]),
                            "active": promo["is_active"].strip().lower() in ("1", "true", "yes")})
        return matches

    def order(self, order_id: str, email: str) -> dict[str, Any] | None:
        customer = next((c for c in self.customers if c["email"].casefold() == email.casefold()), None)
        order = next((o for o in self.orders if o["order_id"] == order_id), None)
        if not customer or not order or order["customer_id"] != customer["customer_id"]:
            return None
        return {k: order.get(k, "") for k in ("order_id", "status", "estimated_delivery", "tracking_code", "total_brl")}


def money(value: float) -> str:
    return (f"R$ {value:,.2f}").replace(",", "X").replace(".", ",").replace("X", ".")


def policy_answer(text: str) -> str:
    q = text.casefold()
    if any(w in q for w in ("horário", "horario", "abre", "fecha", "funcionamento")):
        return "A loja funciona de segunda a sexta, das 9h às 18h, e aos sábados, das 9h às 13h. Domingos e feriados, fechamos. Em datas especiais o horário pode mudar."
    if any(w in q for w in ("endereço", "endereco", "onde fica", "localização", "localizacao")):
        return "Estamos na Rua 14 de Maio, 3200 — Centro, Campo Grande - MS, CEP 79202-333."
    if any(w in q for w in ("devolver", "devolução", "devolucao", "arrepend")):
        return "Em compras online, você pode pedir a devolução em até 7 dias corridos após receber o produto. Ele deve estar sem uso e na embalagem original, com manuais e acessórios. O frete de retorno é por nossa conta e o reembolso ocorre pela forma original em até 10 dias úteis. Para verificar seu caso e iniciar o processo, preciso encaminhar você à equipe."
    if any(w in q for w in ("troca", "defeito", "garantia")):
        return "Para defeito de fabricação, a política prevê solicitação de troca em até 30 dias corridos da compra; a garantia legal indicada no manual é de 90 dias após o recebimento. As condições dependem do caso, então posso encaminhar você à equipe para confirmar os próximos passos."
    if any(w in q for w in ("pix", "parcel", "pagamento", "cartão", "cartao", "boleto")):
        return "Aceitamos PIX (5% de desconto sobre preço de tabela), débito, crédito em até 12x sem juros conforme o valor mínimo da parcela, e boleto à vista. Promoções não acumulam com o desconto do PIX."
    if any(w in q for w in ("frete", "entrega", "prazo")):
        return "Na região metropolitana de Campo Grande, o prazo estimado é de 1 a 3 dias úteis; frete grátis acima de R$ 500 e R$ 35 abaixo disso. Para outras cidades, prazo e valor dependem do CEP e do produto."
    return "Posso ajudar com instrumentos, pedidos, horários, pagamentos, entregas e políticas da loja. Para esse assunto, vou precisar confirmar com a equipe."


def route(store: Store, message: str) -> tuple[str, dict[str, Any] | None]:
    q = message.casefold()
    if any(w in q for w in ("corda", "palheta", "cabo", "case", "pedal", "amplificador")):
        return ("Trabalhamos exclusivamente com instrumentos musicais e não comercializamos acessórios como cabos, cordas, palhetas, cases ou pedais. Para esses itens, uma loja de áudio ou instrumentos que venda acessórios pode ajudar. Posso procurar um instrumento para você.", None)
    if any(w in q for w in ("pedido", "rastre", "entrega do pedido", "status")):
        oid = re.search(r"\b(?:pedido\s*)?#?(\d{1,6})\b", q)
        email = re.search(r"[\w.+-]+@[\w.-]+\.[a-z]{2,}", q)
        if not oid or not email:
            return "Para proteger seus dados, envie o número do pedido e o e-mail usado na compra.", None
        result = store.order(oid.group(1), email.group(0))
        if not result:
            return "Não consegui localizar um pedido com esses dados. Confira o número e o e-mail ou peça ajuda à equipe.", None
        return "Encontrei as informações do pedido:", {"order": result, "items": [x for x in store.items if x["order_id"] == oid.group(1)]}
    if any(w in q for w in ("promoção", "promocao", "desconto", "black friday")):
        matches = store.promotion(message)
        return ("Consultei as promoções cadastradas:", {"promotions": matches}) if matches else (policy_answer(message), None)
    if any(w in q for w in ("preço", "preco", "custa", "disponível", "disponivel", "estoque", "violão", "violao", "guitarra", "baixo", "teclado", "bateria", "ukulele", "instrumento", "até r$", "ate r$")):
        budget = re.search(r"(?:até|ate|menos de)\s*r?\$?\s*(\d+(?:[.,]\d{1,2})?)", q)
        max_price = float(budget.group(1).replace(",", ".")) if budget else None
        results = store.catalog(message, max_price=max_price)
        return ("Consultei o catálogo e o estoque deste conjunto de dados:", {"products": results})
    return policy_answer(message), None


def format_local(answer: str, facts: dict[str, Any] | None) -> str:
    if not facts:
        return answer
    if "products" in facts:
        products = facts["products"]
        if not products:
            return "Não encontrei opções correspondentes no catálogo deste conjunto de dados. Se quiser, me diga outro modelo ou faixa de preço."
        return answer + "\n" + "\n".join(f"• {p['name']} — {money(p['price_brl'])}; estoque informado: {p['stock']} unidade(s)." for p in products) + "\nOs valores refletem o arquivo fornecido, não uma consulta a estoque ao vivo."
    if "promotions" in facts:
        items = facts["promotions"]
        if not items:
            return "Não encontrei uma promoção cadastrada para esse produto. Posso verificar o preço atual no catálogo se você me disser o modelo exato."
        return answer + "\n" + "\n".join((f"• {x['name']}: promoção ativa, {x['discount_percent']:g}% off (preço promocional estimado {money(x['price_brl'] * (1-x['discount_percent']/100))}; tabela {money(x['price_brl'])})." if x['active'] else f"• {x['name']}: a promoção cadastrada está inativa; preço atual no conjunto de dados {money(x['price_brl'])}.") for x in items)
    if "order" in facts:
        o = facts["order"]
        status = o["status"]
        date = o["estimated_delivery"] or ""
        if date and date < "2026-10-31":
            status = "registro histórico: " + status
        return f"{answer}\nPedido #{o['order_id']}: status {status}; previsão registrada {date or 'não informada'}; rastreio {o['tracking_code'] or 'ainda não informado'}. Esses dados vêm de um arquivo histórico, não de uma consulta ao sistema atual."
    return answer


def maybe_llm(message: str, factual_answer: str) -> str:
    if not os.getenv("OPENAI_API_KEY"):
        return factual_answer
    try:
        from openai import OpenAI
        client = OpenAI()
        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            instructions=("Você atende a Empório da Música em português brasileiro, de forma calorosa, clara e concisa. "
                         "Reescreva a resposta-base para soar natural. Preserve todos os fatos, números, ressalvas e limites. "
                         "Não invente dados, não diga que fez ações, e não remova a ressalva sobre dados não ao vivo."),
            input=f"Mensagem do cliente: {message}\nResposta-base verificada: {factual_answer}",
        )
        return response.output_text.strip() or factual_answer
    except Exception as exc:
        print(f"[LLM indisponível; usando resposta local: {type(exc).__name__}]")
        return factual_answer


def respond(store: Store, message: str) -> str:
    base, facts = route(store, message)
    return maybe_llm(message, format_local(base, facts))


def main() -> None:
    store = Store.load()
    print("Empório da Música — atendimento virtual (protótipo). Digite 'sair' para encerrar.")
    while True:
        try:
            message = input("Você: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAté mais!")
            break
        if message.casefold() in {"sair", "exit", "quit"}:
            print("Até mais! Boa música!")
            break
        if message:
            print("Empório: " + respond(store, message))


if __name__ == "__main__":
    main()
