from jinja2 import Environment, FileSystemLoader
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")


def generate_report(data: dict, output_path: str) -> str:
    """Generate a PDF risk report using WeasyPrint."""
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    template = env.get_template("risk_report.html")

    html_content = template.render(
        company_name=data.get("company_name", "Company"),
        report_date=datetime.now().strftime("%B %d, %Y"),
        total_employees=data.get("total_employees", 0),
        critical_count=data.get("critical_count", 0),
        high_count=data.get("high_count", 0),
        avg_fragility=data.get("avg_fragility", 0),
        top_spofs=data.get("top_spofs", []),
        communities=data.get("communities", []),
    )

    try:
        from weasyprint import HTML
        HTML(string=html_content).write_pdf(output_path)
        logger.info(f"PDF report generated: {output_path}")
    except ImportError:
        # Fallback: save as HTML if WeasyPrint not available
        html_path = output_path.replace(".pdf", ".html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        logger.warning(f"WeasyPrint not available. HTML report saved: {html_path}")
        return html_path

    return output_path
