"""
WealthOS SHACL Validation Engine
Executes W3C SHACL constraint validation on RDF Knowledge Graphs using PySHACL.
"""

import os
from typing import Dict, Any, Optional
from rdflib import Graph
try:
    import pyshacl
except ImportError:
    pyshacl = None


class SHACLValidationService:
    """
    Service for validating RDF Knowledge Graphs against SHACL shapes.
    Enforces financial data governance, non-negative balances, required identifiers, and sector taxonomy constraints.
    """

    DEFAULT_SHAPES_PATH = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "ontology", "wealthos_shapes.shacl.ttl")
    )

    @classmethod
    def load_shapes_graph(cls, shapes_path: Optional[str] = None) -> Graph:
        path = shapes_path or cls.DEFAULT_SHAPES_PATH
        shapes_graph = Graph()
        if os.path.exists(path):
            shapes_graph.parse(path, format="turtle")
        return shapes_graph

    @classmethod
    def validate_graph(
        cls,
        data_graph: Graph,
        shapes_graph: Optional[Graph] = None,
        advanced: bool = True,
        inference: str = "rdfs",
    ) -> Dict[str, Any]:
        """
        Validates the data_graph against the SHACL shapes.
        Returns a structured dictionary with conforms (bool), total_violations, results list, and text report.
        """
        if shapes_graph is None or len(shapes_graph) == 0:
            shapes_graph = cls.load_shapes_graph()

        try:
            conforms, results_graph, results_text = pyshacl.validate(
                data_graph=data_graph,
                shacl_graph=shapes_graph,
                inference=inference,
                abort_on_first=False,
                advanced=advanced,
                meta_shacl=False,
                debug=False,
            )

            # Query results from results_graph
            query = """
                PREFIX sh: <http://www.w3.org/ns/shacl#>
                SELECT ?focusNode ?resultPath ?resultSeverity ?resultMessage ?sourceConstraintComponent ?sourceShape
                WHERE {
                    ?report a sh:ValidationReport ;
                            sh:result ?result .
                    ?result sh:focusNode ?focusNode .
                    OPTIONAL { ?result sh:resultPath ?resultPath }
                    OPTIONAL { ?result sh:resultSeverity ?resultSeverity }
                    OPTIONAL { ?result sh:resultMessage ?resultMessage }
                    OPTIONAL { ?result sh:sourceConstraintComponent ?sourceConstraintComponent }
                    OPTIONAL { ?result sh:sourceShape ?sourceShape }
                }
            """
            rows = []
            for row in results_graph.query(query):
                rows.append({
                    "focus_node": str(row.focusNode) if row.focusNode else None,
                    "property_path": str(row.resultPath) if row.resultPath else None,
                    "severity": str(row.resultSeverity).split("#")[-1] if row.resultSeverity else "Violation",
                    "message": str(row.resultMessage) if row.resultMessage else "Constraint violation",
                    "constraint": str(row.sourceConstraintComponent).split("#")[-1] if row.sourceConstraintComponent else None,
                    "shape": str(row.sourceShape) if row.sourceShape else None,
                })

            return {
                "conforms": conforms,
                "total_violations": len(rows),
                "violations": rows,
                "report_text": results_text,
            }

        except Exception as e:
            return {
                "conforms": False,
                "total_violations": 1,
                "violations": [{"message": f"SHACL execution error: {str(e)}", "severity": "Violation"}],
                "report_text": str(e),
            }
