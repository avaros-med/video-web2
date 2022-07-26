import styled from 'styled-components'
import Colors from '../../../colors'
import { Demographic } from '../../../services/models/Demographic.model'
import { AsyncTypeahead } from '../../UI/AsyncTypeahead'
import { FontWeightBoldStyles } from '../../UI/styles/styles'
import { useHttpDemographic } from './useHttpDemographic'

interface Props {
    classes?: string
    onChange: (demographic: Demographic) => void
}

const Styles = styled.div`
    width: 100%;

    .rbt {
        width: 100%;

        input {
            height: unset;
            padding: 12px 16px;
            width: 100%;
            background: ${Colors.CONTENT_BACKGROUND};
            border-radius: 5px;
            border: 0;
        }
    }

    .dropdown {
        &-menu {
            padding: 4px;
            background: white;
            border-color: ${Colors.BORDER_COLOR};
            border-radius: 2px;
            box-shadow: 0 8px 16px 0 rgba(0, 0, 0, 0.04);
            font-size: 14px;
            color: $hint;
        }

        &-item {
            padding: 8px 12px;
            background: white;

            &:focus,
            &:hover,
            &:active {
                background-color: ${Colors.CONTENT_BACKGROUND_LIGHT} !important;
                color: initial !important;
            }

            &.active {
                background-color: white !important;
                color: ${Colors.BLUE} !important;

                .material-icons {
                    color: ${Colors.BLUE} !important;
                }
            }

            .rbt-highlight-text {
                background: transparent !important;
                color: ${Colors.BLUE};
                font-weight: 500;
            }
        }
    }
`

export const SearchPatientTypeahead = ({ classes, onChange }: Props) => {
    const { demographics, isLoading, searchDemographic } = useHttpDemographic()

    return (
        <Styles className={classes ?? ''}>
            <FontWeightBoldStyles className="d-block mb-1">
                Search Patient
            </FontWeightBoldStyles>
            <AsyncTypeahead
                id="search-patient-typeahead"
                isLoading={isLoading}
                selected={undefined}
                options={demographics}
                onSearch={searchDemographic}
                onChange={(selected: Demographic[]) => {
                    if (selected?.length) {
                        onChange(selected.pop()!)
                    }
                }}
                labelKey={(demographic: Demographic) =>
                    `${Demographic.getFullName(demographic)}`
                }
                filterBy={() => true}
                placeholder="Search"
            />
        </Styles>
    )
}
